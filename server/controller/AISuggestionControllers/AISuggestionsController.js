import Identity from "../../schema/identitySchema.js";
import AISuggestion from "../../models/AISuggestion.js";
import redisClient from "../../config/redisConfig.js";
import { getHabitsForIdentity } from "../../utils/habitListUtil.js";
import { getVoteSummaryForHabit } from "../../utils/voteSummaryUtil.js";
import { callAI } from "../../utils/aiClient.js";
import { aiResponseSchema, listSuggestionsQuerySchema } from "../../schema/AISuggestionsSchema.js";

// 1 hour cooldown per user+identity — tune this value later if needed
const COOLDOWN_TTL_SECONDS = 60 * 60;

// Redis key format: ai-suggestion-cooldown:{userId}:{identityId}
const cooldownKey = (userId, identityId) => `ai-suggestion-cooldown:${userId}:${identityId}`;

// POST /api/ai-suggestions/:identityId/generate
export const generateSuggestions = async (req, res) => {
    const { identityId } = req.params;
    const userId = req.user.id || req.user.userId;

    try {
        // Step 1: verify this identity actually belongs to the requesting user
        const identity = await Identity.findOne({ _id: identityId, userId });
        if (!identity) {
            return res.status(404).json({
                success: false,
                message: "Identity not found"
            });
        }

        // Step 2: check cooldown — prevents repeated API hits and controls LLM cost
        const inCooldown = await redisClient.get(cooldownKey(userId, identityId));
        if (inCooldown) {
            return res.status(429).json({
                success: false,
                message: "Suggestions for this identity were recently generated. Please wait before generating again."
            });
        }

        // Step 3: fetch active habits — AI call is pointless with no habits
        const habits = await getHabitsForIdentity(identityId, userId);
        if (!habits || habits.length === 0) {
            return res.status(400).json({
                success: false,
                message: "You need at least one active habit before generating suggestions"
            });
        }

        // Step 4: build Insight Payload — reuses the same aggregation logic used in the dashboard/summary endpoints
        // AI only ever receives pre-computed numbers, never raw HabitLog documents
        const habitStats = await Promise.all(
            habits.map(async (habit) => {
                const summary = await getVoteSummaryForHabit(habit._id.toString(), userId);
                return {
                    habitId: habit._id.toString(),
                    name: habit.name,
                    weeklyVotes: summary?.weeklyCount ?? 0,
                    monthlyVotes: summary?.monthlyCount ?? 0,
                    allTimeVotes: summary?.totalVotes ?? 0,
                    rollingConsistency: summary ? summary.rollingConsistency / 100 : 0, // store as 0-1 fraction for the AI
                    missedYesterday: summary?.missedYesterday ?? false
                };
            })
        );

        const totalVotesAllTime = habitStats.reduce((sum, h) => sum + h.allTimeVotes, 0);

        const insightPayload = {
            identity: {
                id: identityId,
                name: identity.name,
                totalVotesAllTime
            },
            habits: habitStats
        };

        // Step 5: call AI — on failure or timeout, return 503 and store nothing
        let rawAIText;
        try {
            rawAIText = await callAI(insightPayload);
        } catch (aiError) {
            console.error("AI call failed or timed out:", aiError.message);
            return res.status(503).json({
                success: false,
                message: "AI service is temporarily unavailable. Please try again later."
            });
        }

        // Step 6: parse and validate AI output — never store or return unvalidated output
        let parsedAIResponse;
        try {
            // AI should return clean JSON but sometimes wraps in markdown fences — strip them if present
            const cleaned = rawAIText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
            parsedAIResponse = JSON.parse(cleaned);
        } catch {
            console.error("AI returned non-JSON response:", rawAIText);
            return res.status(502).json({
                success: false,
                message: "AI returned an unexpected response format. Please try again."
            });
        }

        const validationResult = aiResponseSchema.safeParse(parsedAIResponse);
        if (!validationResult.success) {
            console.error("AI response failed schema validation:", validationResult.error.issues, "Raw:", rawAIText);
            return res.status(502).json({
                success: false,
                message: "AI returned an unexpected response format. Please try again."
            });
        }

        const validatedAI = validationResult.data;

        // Step 7: cross-check AI-returned habitIds against the habits we actually sent in the payload
        // the AI is a validation boundary — treat a hallucinated/stale habitId the same as malformed user input: drop it, don't patch it
        const habitNameMap = Object.fromEntries(habits.map(h => [h._id.toString(), h.name]));
        const validHabitIds = new Set(Object.keys(habitNameMap));

        const enrichedHabitSuggestions = validatedAI.habitSuggestions
            .filter((s) => {
                const isValid = validHabitIds.has(s.habitId);
                if (!isValid) {
                    // log so prompt drift or AI hallucination is visible in server logs — not just a display issue
                    console.warn(
                        `AI returned unknown habitId "${s.habitId}" for identityId "${identityId}" / userId "${userId}" — dropping entry`
                    );
                }
                return isValid;
            })
            .map((s) => ({
                ...s,
                habitName: habitNameMap[s.habitId] // always resolves — only entries that passed the filter reach here
            }));
        // an empty array after filtering is fine — identityDeepening is still valid and gets stored


        // Step 8: persist — AI output is generated content, not recomputable from HabitLogs, so we store it
        const suggestion = await AISuggestion.create({
            userId,
            identityId,
            identityDeepening: validatedAI.identityDeepening,
            habitSuggestions: enrichedHabitSuggestions,
            insightPayloadSnapshot: insightPayload // stored for debugging/auditability — never returned to the user
        });

        // Step 9: set cooldown AFTER successful persistence — if creation fails, user can retry immediately
        await redisClient.set(cooldownKey(userId, identityId), "true", { EX: COOLDOWN_TTL_SECONDS });

        // return without the insightPayloadSnapshot — that's internal/audit only
        const { insightPayloadSnapshot: _omit, ...responseSuggestion } = suggestion.toObject();

        return res.status(201).json({
            success: true,
            suggestion: responseSuggestion
        });

    } catch (error) {
        console.error("error occurred while generating AI suggestions:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

// GET /api/ai-suggestions/:identityId
export const getSuggestionHistory = async (req, res) => {
    const { identityId } = req.params;
    const userId = req.user.id || req.user.userId;

    // parse optional limit from query — defaults to 10, max 50
    const queryParse = listSuggestionsQuerySchema.safeParse(req.query);
    const limit = queryParse.success ? queryParse.data.limit : 10;

    try {
        // ownership check on the identity first — don't leak history for identities the user doesn't own
        const identity = await Identity.findOne({ _id: identityId, userId });
        if (!identity) {
            return res.status(404).json({
                success: false,
                message: "Identity not found"
            });
        }

        // fetch history, most recent first — insightPayloadSnapshot excluded from output
        const suggestions = await AISuggestion
            .find({ userId, identityId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("-insightPayloadSnapshot"); // audit field — never shown to the user

        return res.status(200).json({
            success: true,
            suggestions
        });

    } catch (error) {
        console.error("error occurred while fetching suggestion history:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

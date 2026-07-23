import BuddyPairing from "../../schema/buddyPairingSchema.js";
import { getHabitsForIdentity } from "../../utils/habitListUtil.js";
import { getVoteSummaryForHabit } from "../../utils/voteSummaryUtil.js";

// GET /api/buddy/:identityId
export const viewPartnerDataController = async (req, res) => {
    const { identityId } = req.params;
    const buddyUserId = req.user.id || req.user.userId;

    try {
        // single query: verifies the buddy has access AND gives us the owner's ID — no separate lookup needed
        const pairing = await BuddyPairing.findOne({ identityId, buddyUserId, status: "active" });

        // generic rejection — don't reveal whether the identity doesn't exist, isn't shared, or the pairing is inactive
        if (!pairing) {
            return res.status(404).json({
                success: false,
                message: "Not found"
            });
        }

        const ownerUserId = pairing.ownerUserId.toString();

        // get the owner's habits for this identity (non-archived only)
        const habits = await getHabitsForIdentity(identityId, ownerUserId);

        // for each habit, fetch the owner's vote summary using the shared util
        const habitsWithSummary = await Promise.all(
            habits.map(async (habit) => {
                const summary = await getVoteSummaryForHabit(habit._id.toString(), ownerUserId);
                return {
                    habitId: habit._id,
                    habitName: habit.name,
                    ...(summary ?? { weeklyCount: 0, monthlyCount: 0, totalVotes: 0, missedYesterday: false, rollingConsistency: 0 })
                };
            })
        );

        return res.status(200).json({
            success: true,
            identityId,
            habits: habitsWithSummary
        });

    } catch (error) {
        console.error("error occurred while viewing partner data:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

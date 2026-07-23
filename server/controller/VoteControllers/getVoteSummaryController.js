import { validateObjectId } from "../../utils/validation.js";
import { getVoteSummaryForHabit } from "../../utils/voteSummaryUtil.js";

// this controller still uses server-UTC date ranges (last 7 / last 30 days) and passes server-UTC today to computeMissedYesterday.
// Making rolling windows timezone-aware is a separate, harder problem — needs a follow-up pass once single-day timezone handling is confirmed working.

// GET /votes/summary
export const getVoteSummary = async (req, res) => {
    const { habitId } = req.query;
    const userId = req.user.id || req.user.userId;

    // validate habitId is present and is a valid MongoDB ObjectId format before hitting the pipeline
    if (!habitId) {
        return res.status(400).json({
            success: false,
            message: "habitId query parameter is required"
        });
    }

    if (!validateObjectId(habitId, res, "habit")) return;

    try {
        // delegate to the shared util — same logic, just accepts plain params instead of req
        const summary = await getVoteSummaryForHabit(habitId, userId);

        // util returns null if the habit wasn't found or doesn't belong to this user
        if (!summary) {
            return res.status(404).json({
                success: false,
                message: "Habit not found or does not belong to the user"
            });
        }

        return res.status(200).json({
            success: true,
            ...summary
        });

    } catch (error) {
        console.error("error occurred while fetching vote summary:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

import ScorecardEntry from "../../schema/ScorecardEntry.js";
import { validateObjectId } from "../../utils/validation.js";

// DELETE /scorecard/:entryId
export const deleteEntryController = async (req, res) => {
    const { entryId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Validate entryId is a syntactically valid MongoDB ObjectId before hitting the DB
    if (!validateObjectId(entryId, res, "entry")) return;

    // only today's entries can be deleted — use timezone-aware today from middleware
    const todayNormalized = req.todayForUser;

    try {
        // Single combined delete: checks ownership, existence, and same-day constraint all at once
        const result = await ScorecardEntry.deleteOne({ _id: entryId, userId, date: todayNormalized });

        // If 0 — covers not found, not owned, or not today's entry — not distinguishing which, same as edit
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Entry not found, not owned by you, or cannot be deleted after today"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Entry deleted successfully"
        });
    } catch (error) {
        console.error("error occurred while deleting scorecard entry:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

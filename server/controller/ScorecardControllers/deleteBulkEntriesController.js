import ScorecardEntry from "../../schema/ScorecardEntry.js";
import { isValidObjectId } from "../../utils/validation.js";

// DELETE /api/scorecard
export const deleteBulkEntriesController = async (req, res) => {
    // Extract parameters from request body and token
    const { entryIds } = req.body;
    const userId = req.user.userId || req.user.id;
    const today = req.todayForUser; // Midnight UTC of today in user's timezone

    // Validate that entryIds is a non-empty array
    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "entryIds must be a non-empty array"
        });
    }

    // Validate that EVERY item in the array is a valid MongoDB format
    const hasInvalidId = entryIds.some(id => !isValidObjectId(id));
    if (hasInvalidId) {
        return res.status(400).json({
            success: false,
            message: "One or more entry IDs are in an invalid format"
        });
    }

    try {
        // Enforce date: today constraint so historical entries cannot be deleted
        const result = await ScorecardEntry.deleteMany({
            _id: { $in: entryIds },
            userId,
            date: today
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "No matching entries found to delete for today"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Selected scorecard entries deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("error occurred while bulk deleting scorecard entries:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

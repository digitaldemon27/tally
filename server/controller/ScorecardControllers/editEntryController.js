import ScorecardEntry from "../../schema/ScorecardEntry.js";

// PATCH /scorecard/:entryId
export const editEntryController = async (req, res) => {
    const { entryId } = req.params;
    // note and label are already validated by Zod middleware — safe to destructure directly
    const { note, label } = req.body;
    const userId = req.user.id || req.user.userId;

    // only today's entries can be edited — use timezone-aware today from middleware
    const todayNormalized = req.todayForUser;

    try {
        // Single combined query: checks ownership, existence, and same-day constraint all at once
        // If null — covers not found, not owned, or not today's entry — deliberately not distinguishing which
        const updated = await ScorecardEntry.findOneAndUpdate(
            { _id: entryId, userId, date: todayNormalized },
            { note, label },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Entry not found, not owned by you, or cannot be edited after today"
            });
        }

        return res.status(200).json({
            success: true,
            entry: updated
        });
    } catch (error) {
        console.error("error occurred while editing scorecard entry:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

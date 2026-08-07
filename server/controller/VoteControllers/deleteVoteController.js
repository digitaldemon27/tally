import HabitLog from "../../schema/habitLogSchema.js";

// DELETE /votes/:id
export const deleteVote = async (req, res) => {
    // Destructure id mapping it to voteId variable for clarity
    const { id: voteId } = req.params;
    const userId = req.user.id || req.user.userId;

    try {
        //single atomic operation that simultaneously verifies the user's ownership of the vote and deletes it
        const deletedVote = await HabitLog.findOneAndDelete({ _id: voteId, userId });

        if (!deletedVote) {
            return res.status(404).json({
                success: false,
                message: "Vote not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vote deleted successfully",
            voteId: deletedVote._id
        });
    } catch (error) {
        console.error("error occurred while deleting vote:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

// DELETE /votes/today?habitId=...
export const deleteTodayVote = async (req, res) => {
    const { habitId } = req.query;
    const userId = req.user.id || req.user.userId;
    const date = req.todayForUser;

    if (!habitId) {
        return res.status(400).json({
            success: false,
            message: "habitId query parameter is required"
        });
    }

    try {
        const deletedVote = await HabitLog.findOneAndDelete({ userId, habitId, date });

        if (!deletedVote) {
            return res.status(404).json({
                success: false,
                message: "No vote found for today to remove"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Today's vote removed successfully",
            voteId: deletedVote._id
        });
    } catch (error) {
        console.error("error occurred while deleting today's vote:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

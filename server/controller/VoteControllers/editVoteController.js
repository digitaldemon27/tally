import HabitLog from "../../schema/habitLogSchema.js";

// PATCH /votes/:id
export const editVote = async (req, res) => {
    // Destructure id mapping it to voteId variable for clarity
    const { id: voteId } = req.params;
    const { note } = req.body;
    const userId = req.user.id || req.user.userId;

    try {
        //ownership verification before hitting DB
        const updatedVote = await HabitLog.findOneAndUpdate(
            { _id: voteId, userId },
            { note },
            { new: true }
        );

        if (!updatedVote) {
            return res.status(404).json({
                success: false,
                message: "Vote not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vote updated successfully",
            vote: updatedVote
        });
    } catch (error) {
        console.error("error occurred while editing vote:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

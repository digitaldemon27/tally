import Habit from "../../schema/habitSchema.js";

// PATCH /api/habits/:id/archive
export const archiveHabitToggle = async (req, res) => {
    // Extract parameters from request
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const { isArchived } = req.body;

    if (typeof isArchived !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: "isArchived must be a boolean value"
        });
    }

    try {
        // Run update to toggle habit archive status
        const updatedHabit = await Habit.findOneAndUpdate(
            { _id: id, userId },
            { isArchived },
            { new: true } //to return the new updated document
        );

        // If habit is not found or user unauthorized
        if (!updatedHabit) {
            return res.status(404).json({
                success: false,
                message: "habit not found"
            });
        }

        // Return successful response with updated habit object
        return res.status(200).json({
            success: true,
            message: "Habit archive status updated",
            habit: updatedHabit
        });
    } catch (error) {
        // Log the internal error stack trace
        console.error("error occurred while archiving habit:", error.message);

        // Return clean internal server error response
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

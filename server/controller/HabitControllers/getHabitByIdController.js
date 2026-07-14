import Habit from "../../schema/habitSchema.js";
import mongoose from "mongoose";

// GET /api/habits/:id
export const getHabitById = async (req, res) => {
    // Extract parameters from request
    const { id: habitId } = req.params;
    const userId = req.user.userId || req.user.id;

    //if habitId is not in the format of the mongoDB objectId , why to pay cost of hitting query before validation??
    if (!mongoose.Types.ObjectId.isValid(habitId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid habit ID format"
        });
    }
    try {
        // Fetch single habit matching habit ID and user constraints
        const habit = await Habit.findOne({ _id: habitId, userId });

        // If the habit is not found or belongs to another user
        if (!habit) {
            return res.status(404).json({
                success: false,
                message: "habit not found"
            });
        }

        // Return successful response with habit object
        return res.status(200).json(habit);
    } catch (error) {
        // Log the internal error stack trace
        console.error("error occurred while fetching habit by ID:", error.message);

        // Return clean internal server error response
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

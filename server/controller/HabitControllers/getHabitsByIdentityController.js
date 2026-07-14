import Habit from "../../schema/habitSchema.js";
import mongoose from "mongoose";

// Fetch habits matching identity and user constraints
export const getHabitsByIdentity = async (req, res) => {
    // Extract parameters from request
    const { identityId } = req.params;
    const userId = req.user.userId || req.user.id;
    const { archived } = req.query;

    if (!identityId) {
        return res.status(400).json({
            success: false,
            message: "missing parameters"
        })
    }
    if (!mongoose.Types.ObjectId.isValid(identityId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid identity ID format"
        });
    }
    // To hide archived habits from the main dashboard by default, while allowing the client to fetch them via query parameters for historical views.
    const filter = {
        identityId,
        userId,
        isArchived: archived === 'true'
    };

    try {
        // Fetch habits matching identity and user constraints
        const habits = await Habit.find(filter);

        // Return successful response with habits array
        return res.status(200).json(habits);
    } catch (error) {
        // Log the internal error stack trace
        console.error("error occurred while fetching habits for identity:", error.message);

        // Return clean internal server error response
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

import Habit from "../../schema/habitSchema.js";

// Fetch habits matching identity and user constraints
export const getHabitsByIdentity = async (req, res) => {
    // Extract parameters from request
    const { identityId } = req.params;
    const userId = req.user.userId || req.user.id;

    try {
        // Fetch habits matching identity and user constraints
        const habits = await Habit.find({ identityId, userId });

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

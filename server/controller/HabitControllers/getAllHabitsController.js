import Habit from "../../schema/habitSchema.js";

// GET /api/habits
export const getAllUserHabits = async (req, res) => {
    // Extract parameters from request
    const userId = req.user.userId || req.user.id;
    const { archived } = req.query;

    //To hide archived habits from the main dashboard by default, while allowing the client to fetch them via query parameters for historical views.
    const filter = {
        userId,
        isArchived: archived === 'true'
    };

    try {
        // Fetch all habits belonging to the authenticated user
        const habits = await Habit.find(filter);

        // Return successful response with habits array
        return res.status(200).json(habits);
    } catch (error) {
        // Log the internal error stack trace
        console.error("error occurred while fetching user habits:", error.message);

        // Return clean internal server error response
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

import Habit from "../../schema/habitSchema.js";
import { validateObjectId } from "../../utils/validation.js";

// GET /api/habits
export const getAllUserHabits = async (req, res) => {
    // Extract parameters from request
    const userId = req.user.userId || req.user.id;
    const { archived } = req.query; ///it is parameter sent at the end of the query , after the "?" http://localhost:3000/api/items?archived=true
    const { identityId } = req.params;

    //To hide archived habits from the main dashboard by default, while allowing the client to fetch them via query parameters for historical views.
    const filter = {
        userId,
        isArchived: archived === 'true' //If archived is the string 'true', isArchived becomes true , anything else isArchived becomes false
    };

    // If accessed via nested route, filter by identityId
    if (identityId) {
        // Check if the parameter matches MongoDB's 24-character hex format
        if (!validateObjectId(identityId, res, "identity")) return;

        //if identityId is valid append it to the filter for the query
        filter.identityId = identityId;
    }

    try {
        // Fetch all habits belonging to the authenticated user , in accordance with our filter.
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

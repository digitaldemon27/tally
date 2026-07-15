import Habit from "../../schema/habitSchema.js";
import mongoose from "mongoose"; // ADDED: needed for ObjectId validation

// DELETE /api/habits
export const deleteBulkHabits = async (req, res) => {
    // Extract parameters from request body and token
    const { habitIds } = req.body;
    const userId = req.user.userId || req.user.id;

    // validate that habitIds is a non-empty array
    if (!habitIds || !Array.isArray(habitIds) || habitIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "habitIds must be a non-empty array"
        });
    }

    // Validate that EVERY item in the array is a valid MongoDB format.
    // If even one is malformed (e.g., "123"), Mongoose will crash the whole batch operation.
    const hasInvalidId = habitIds.some(id => typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id));
    if (hasInvalidId) {
        return res.status(400).json({
            success: false,
            message: "One or more habit IDs are in an invalid format"
        });
    }

    try {
        // not using a loop to iterate all the habitIds , executing a single atomic batch operation instead of triggering multiple expensive database round-trips.
        const result = await Habit.deleteMany({ _id: { $in: habitIds }, userId });

        // Handle the case where the IDs are correctly formatted, but none exist in the DB 
        // OR they exist but belong to a different user (middleware userId mismatch).
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "No matching habits found to delete"
            });
        }

        // Return success response with processed count
        return res.status(200).json({
            success: true,
            message: "Selected habits processed successfully",
            deletedCount: result.deletedCount // Will show exactly how many were actually deleted
        });
    } catch (error) {
        // Log the internal error stack trace
        console.error("error occurred while deleting habits:", error.message);

        // Return clean internal server error response
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};
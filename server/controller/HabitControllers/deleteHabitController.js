import Habit from "../../schema/habitSchema.js";
import HabitLog from "../../schema/habitLogSchema.js";
import mongoose from "mongoose";
import { isValidObjectId } from "../../utils/validation.js";

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
    const hasInvalidId = habitIds.some(id => !isValidObjectId(id));
    if (hasInvalidId) {
        return res.status(400).json({
            success: false,
            message: "One or more habit IDs are in an invalid format"
        });
    }

    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Delete all vote logs tied to these habits, scoped to this user.
            // No identityId filter needed here — habitId scoped to userId is sufficient.
            const logResult = await HabitLog.deleteMany({ habitId: { $in: habitIds }, userId }, { session });

            // Delete the habits themselves, ownership check combined directly into the filter.
            // not using a loop to iterate all the habitIds , executing a single atomic batch operation instead of triggering multiple expensive database round-trips.
            const habitResult = await Habit.deleteMany({ _id: { $in: habitIds }, userId }, { session });

            // Handle the case where the IDs are correctly formatted, but none exist in the DB 
            // OR they exist but belong to a different user (middleware userId mismatch).
            if (habitResult.deletedCount === 0) {
                // If 0 -> habits did not exist or were not owned by this user.
                // Aborting the transaction automatically rolls back any deleted HabitLogs.
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: "No matching habits found to delete"
                });
            }

            // Proceed to commit if habits were successfully deleted.
            await session.commitTransaction();

            // Return success response with processed count
            return res.status(200).json({
                success: true,
                message: "Selected habits processed successfully",
                deletedCount: habitResult.deletedCount, // Will show exactly how many were actually deleted
                deletedLogsCount: logResult.deletedCount
            });
        } catch (txError) {
            await session.abortTransaction();
            throw txError;
        } finally {
            session.endSession();
        }
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
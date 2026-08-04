import Habit from "../../schema/habitSchema.js";
import { validateObjectId, isValidObjectId } from "../../utils/validation.js";

// PATCH /api/habits/:id/archive
export const archiveHabitToggle = async (req, res) => {
    // Extract parameters from request
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const { isArchived } = req.body;

    //Validate MongoDB ObjectId format to prevent CastError server crashes
    if (!validateObjectId(id, res, "habit")) return;

    // Explicitly handle when nothing is sent in the body (undefined)
    if (isArchived === undefined) {
        return res.status(400).json({
            success: false,
            message: "isArchived field is required in the request body"
        });
    }

    if (typeof isArchived !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: "isArchived must be a boolean value"
        });
    }

    try {
        // Check current status to prevent unnecessary extra write operations
        const existingHabit = await Habit.findOne({ _id: id, userId });

        if (!existingHabit) {
            return res.status(404).json({
                success: false,
                message: "habit not found"
            });
        }

        if (existingHabit.isArchived === isArchived) {
            return res.status(400).json({
                success: false,
                message: `Habit is already ${isArchived ? 'archived' : 'unarchived'}`
            });
        }

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

// PATCH /api/habits/archive
export const archiveBulkHabits = async (req, res) => {
    const { habitIds, isArchived } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!habitIds || !Array.isArray(habitIds) || habitIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "habitIds must be a non-empty array"
        });
    }

    const hasInvalidId = habitIds.some(id => !isValidObjectId(id));
    if (hasInvalidId) {
        return res.status(400).json({
            success: false,
            message: "One or more habit IDs are in an invalid format"
        });
    }

    const targetArchived = isArchived !== undefined ? Boolean(isArchived) : true;

    try {
        const result = await Habit.updateMany(
            { _id: { $in: habitIds }, userId },
            { isArchived: targetArchived }
        );

        return res.status(200).json({
            success: true,
            message: `Selected habits ${targetArchived ? 'archived' : 'unarchived'} successfully`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("error occurred while archiving habits in bulk:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};
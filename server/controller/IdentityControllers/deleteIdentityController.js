import mongoose from "mongoose";
import Identity from "../../schema/identitySchema.js";
import Habit from "../../schema/habitSchema.js";

// DELETE /api/identities
export const deleteBulkIdentities = async (req, res) => {
    // Extract parameters from request body and token
    const { identityIds } = req.body;
    const userId = req.user.userId || req.user.id;

    // validate that identityIds is provided
    if (identityIds === undefined || identityIds === null) {
        return res.status(400).json({
            success: false,
            message: "identityIds is required"
        });
    }

    // validate that identityIds is a native JavaScript Array
    if (!Array.isArray(identityIds)) {
        return res.status(400).json({
            success: false,
            message: "identityIds must be an array"
        });
    }

    // validate that identityIds is not empty
    if (identityIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "At least one identity ID must be provided"
        });
    }

    // validate structural integrity of each ID
    for (const id of identityIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: `Invalid identity ID format: ${id}`
            });
        }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const identityResult = await Identity.deleteMany({ _id: { $in: identityIds }, userId }, { session });

        // Cascading deletion of all habits tied to these identities
        const habitResult = await Habit.deleteMany({ identityId: { $in: identityIds }, userId }, { session });

        // To enforce atomic cascading deletes, ensuring that either both identities and their sub-habits are cleared or none are if a crash occurs we used transaction
        await session.commitTransaction();

        // Return success response with processed counts
        return res.status(200).json({
            success: true,
            message: "Identities and associated habits processed successfully",
            deletedIdentitiesCount: identityResult.deletedCount,
            deletedHabitsCount: habitResult.deletedCount
        });
    } catch (error) { // merged duplicated catch blocks into one
        await session.abortTransaction();

        // Log the internal error stack trace
        console.error("error occurred while deleting identities:", error.message);

        // Return clean internal server error response
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    } finally { // moved to single finally block to prevent executing session.endSession() twice
        session.endSession();
    }
};
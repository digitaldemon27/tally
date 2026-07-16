import Identity from "../../schema/identitySchema.js";
import Habit from "../../schema/habitSchema.js";
import { isValidObjectId } from "../../utils/validation.js";

// DELETE /api/identities
export const deleteBulkIdentities = async (req, res) => {
    // Extract parameters from request body and token
    const { identityIds } = req.body;
    const userId = req.user.userId || req.user.id;

    // validate that identityIds is a non-empty array
    if (!identityIds || !Array.isArray(identityIds) || identityIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "identityIds must be a non-empty array"
        });
    }

    // Validate that EVERY item in the array is a valid MongoDB format.
    // If even one is malformed (e.g., "123"), Mongoose will crash the whole batch operation.
    const hasInvalidId = identityIds.some(id => !isValidObjectId(id));
    if (hasInvalidId) {
        return res.status(400).json({
            success: false,
            message: "One or more identity IDs are in an invalid format"
        });
    }

    try {
        // delete the child habits first to prevent orphaned records if the connection drops midway
        await Habit.deleteMany({ identityId: { $in: identityIds }, userId });

        // not using a loop to iterate all the identityIds , executing a single atomic batch operation instead of triggering multiple expensive database round-trips.
        const result = await Identity.deleteMany({ _id: { $in: identityIds }, userId });

        // Handle the case where the IDs are correctly formatted, but none exist in the DB 
        // OR they exist but belong to a different user (middleware userId mismatch).
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "No matching identities found to delete"
            });
        }

        // Return success response with processed count
        return res.status(200).json({
            success: true,
            message: "Selected identities processed successfully",
            deletedCount: result.deletedCount // Will show exactly how many were actually deleted
        });
    } catch (error) {
        // Log the internal error stack trace
        console.error("error occurred while deleting identities:", error.message);

        // Return clean internal server error response
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};
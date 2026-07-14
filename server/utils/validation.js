/**
 * Helper to validate a MongoDB ObjectId format and send a 400 Bad Request response on failure.
 * 
 * @param {string} id - The ID to validate
 * @param {import("express").Response} res - The Express response object
 * @param {string} [entityName="identity"] - The name of the entity for the error message
 * @returns {boolean} Returns true if valid, false if invalid (response already sent)
 */
export const validateObjectId = (id, res, entityName = "identity") => {
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        res.status(400).json({
            success: false,
            message: `Invalid ${entityName} ID format`
        });
        return false;
    }
    return true;
};

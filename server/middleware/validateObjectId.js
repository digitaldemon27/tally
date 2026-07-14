import { validateObjectId as helper } from "../utils/validation.js";

// Validate that the identityId path parameter is a valid MongoDB ObjectId
export const validateObjectId = (req, res, next) => {
    const { identityId } = req.params;
    if (!helper(identityId, res, "identity")) {
        return;
    }
    next();
};

import { validateObjectId as helper } from "../utils/validation.js";

// Validate that the identityId path parameter is a valid MongoDB ObjectId
export const validateObjectId = (req, res, next) => {
    const id = req.params.identityId || req.params.id;
    const name = req.params.identityId ? "identity" : "habit";
    if (id && !helper(id, res, name)) {
        return;
    }
    next();
};

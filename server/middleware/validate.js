/*
    **Validation middleware factory
         -reusable middleware factory that validates request body against a Zod schema
         -attaches cleaned/parsed data to req.body on success
 */

/**
 * Generic factory for creating Zod validation middleware.
 * Pass any Zod schema, get back a middleware for it.
 * 
 * @param {import("zod").ZodSchema} schema - The Zod schema to validate against
 * @returns {import("express").RequestHandler} Express middleware
 */
export const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            // Format Zod errors
            const formattedErrors = {};
            result.error.issues.forEach((err) => {
                const path = err.path.join(".");
                formattedErrors[path] = err.message;
            });

            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: formattedErrors
            });
        }

        // Attach parsed/validated data (trimmed/cleaned) back onto req.body
        req.body = result.data;
        next();
    };
};

export default validate;

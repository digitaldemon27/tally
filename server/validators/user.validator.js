import { z } from "zod";

// Helper regex to ensure no uppercase letters and no whitespace
const usernameRegex = /^[^A-Z\s]+$/;

/**
 * Zod schema for validating user input during Registration / Creation.
 * Validates the raw password (before hashing).
 */
export const userRegisterValidator = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .transform((val) => val.trim())
    .refine((val) => val.length >= 2, {
      message: "Name must be at least 2 characters long (excluding leading/trailing spaces)",
    }),
  username: z
    .string({ required_error: "Username is required" })
    .transform((val) => val.trim())
    .refine((val) => !/\s/.test(val), {
      message: "Username must not contain spaces",
    })
    .refine((val) => !/[A-Z]/.test(val), {
      message: "Username must be all lowercase",
    }),
  email: z
    .string({ required_error: "Email is required" })
    .transform((val) => {
      let emailVal = val.trim().toLowerCase();
      // If there is no '@' (no extension/domain), add '@gmail.com' by default
      if (!emailVal.includes("@")) {
        emailVal = `${emailVal}@gmail.com`;
      }
      return emailVal;
    })
    // Pipe the transformed output to ensure it matches a valid email layout
    .pipe(z.string().email("Please enter a valid email address")),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters long"),
});

/**
 * Zod schema for validating the full User object mapping to the database model
 * (which expects hashed_password).
 */
export const userDbValidator = userRegisterValidator
  .omit({ password: true })
  .extend({
    hashed_password: z.string({ required_error: "Hashed password is required" }),
    is_email_verified: z.boolean().default(false).optional(),
    is_active: z.boolean().default(true).optional(),
  });

/**
 * Helper validation function that parses input data and returns formatted errors if validation fails.
 * 
 * @param {z.ZodSchema} schema - The Zod validation schema to run
 * @param {Object} data - The payload to validate
 * @returns {{ success: boolean, data?: Object, errors?: Record<string, string> }}
 */
export function validateData(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Format error messages nicely
    const errors = {};
    result.error.issues.forEach((err) => {
      const field = err.path.join(".");
      errors[field] = err.message;
    });
    return { success: false, errors };
  }
  return { success: true, data: result.data };
}

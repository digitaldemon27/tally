import { z } from "zod";

/**
 * Zod validation schema for setting a user password.
 * Validates the request body for:
 * - signupToken: required string
 * - password: required string, min length 8, must contain at least one number and one letter
 * - timezone: required string
 */
export const setPasswordSchema = z.object({
  signupToken: z
    .string({ required_error: "Signup token is required" })
    .min(1, "Signup token cannot be empty"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters long")
    .refine((val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val), {
      message: "Password must contain at least one letter and one number",
    }),
  timezone: z
    .string({ required_error: "Timezone is required" })
    .min(1, "Timezone cannot be empty"),
});

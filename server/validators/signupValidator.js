import { z } from "zod";

/**
 * Zod validation schema for user signup.
 * Validates the request body for:
 * - email: required, valid email format, trimmed, lowercase
 * - username: required string, trimmed, lowercase, no spaces
 */
export const signupSchema = z.object({
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
    .transform((val) => val.trim().toLowerCase())
    .pipe(z.string().email("Please enter a valid email address")),
});

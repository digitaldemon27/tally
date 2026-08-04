import { z } from "zod";

export const usernameRegex = /^(?=.{3,30}$)[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/;
export const gmailRegex = /^(?=.{6,30}@gmail\.com$)(?!\.)(?!.*\.\.)(?!.*\.@)[A-Za-z0-9.]+@gmail\.com$/;

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
    .refine((val) => usernameRegex.test(val), {
      message: "Username must be 3–30 characters long and may contain letters, numbers, dots (.), underscores (_) and hyphens (-). It cannot start or end with a special character or contain consecutive special characters.",
    }),
  email: z
    .string({ required_error: "Email is required" })
    .transform((val) => val.trim().toLowerCase())
    .refine((val) => gmailRegex.test(val), {
      message: "Please enter a valid Gmail address (6-30 characters, no consecutive periods, cannot start or end with a period).",
    }),
});

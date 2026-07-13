import { z } from "zod";

/**
 * Zod validation schema for an identity's name.
 * Validates the `name` field:
 * - Must be a string and is required
 * - Trimmed of leading/trailing whitespace
 * - Length between 2 and 50 characters (inclusive) after trimming
 * - Must not start with an underscore (_) or a period (.)
 * - Must contain at least one alphanumeric character (cannot be only special characters/whitespace)
 */
export const identityNameSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name must be at most 50 characters long")
    .refine((val) => !val.startsWith("_") && !val.startsWith("."), {
      message: "Name must not start with an underscore (_) or a period (.)",
    })
    .refine((val) => /[a-zA-Z0-9]/.test(val), {
      message: "Name must contain at least one letter or number",
    }),
});

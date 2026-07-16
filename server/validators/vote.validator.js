import { z } from "zod";

/**
 * Zod validation schema for casting a vote.
 * Validates the `identityId`, `habitId`, and optionally `note`.
 */
export const castVoteSchema = z.object({
  identityId: z.string({ required_error: "identityId is required" }),
  habitId: z.string({ required_error: "habitId is required" }),
  note: z.string().optional()
});

/**
 * Zod validation schema for editing a vote.
 * Validates that only `note` can be updated.
 */
export const editVoteSchema = z.object({
  note: z.string().optional()
});

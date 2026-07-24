import { z } from "zod";
import mongoose from "mongoose";

// validates the :identityId route param is a real ObjectId string before hitting the DB
// used on both POST /:identityId/generate and GET /:identityId
export const identityIdParamSchema = z.object({
    identityId: z.string().refine(
        (val) => mongoose.Types.ObjectId.isValid(val),
        { message: "identityId must be a valid ObjectId" }
    )
});

// optional limit/pagination for GET history
export const listSuggestionsQuerySchema = z.object({
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .pipe(z.number().int().min(1).max(50))
});

// validates the AI's raw JSON output before it's persisted or returned
// this is a security boundary — treat malformed AI output the same as malformed user input
export const aiResponseSchema = z.object({
    identityDeepening: z.object({
        title: z.string(),
        message: z.string(),
        suggestedHabit: z
            .object({
                name: z.string(),
                rationale: z.string()
            })
            .nullable()
    }),
    habitSuggestions: z.array(
        z.object({
            habitId: z.string(),
            category: z.enum(["consistency", "improvement"]),
            title: z.string(),
            message: z.string()
        })
    )
});

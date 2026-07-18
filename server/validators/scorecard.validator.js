import { z } from "zod";

// Schema for creating a new scorecard entry — note must be non-empty, label must be one of the three allowed words
export const createEntrySchema = z.object({
    note: z.string().trim().min(1, "Note cannot be empty"),
    label: z.enum(["positive", "negative", "neutral"], {
        errorMap: () => ({ message: "Label must be one of: positive, negative, neutral" })
    })
});

// Edit has the exact same shape as create — both fields must be provided on update
export const editEntrySchema = z.object({
    note: z.string().trim().min(1, "Note cannot be empty"),
    label: z.enum(["positive", "negative", "neutral"], {
        errorMap: () => ({ message: "Label must be one of: positive, negative, neutral" })
    })
});

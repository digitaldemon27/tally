import { z } from "zod";

// Schema for sending a nudge message — message must be present and non-empty/non-whitespace
export const sendNudgeSchema = z.object({
    message: z.string().trim().min(1, "Message cannot be empty")
});

import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";

const aiSuggestionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"] // ownership — every query filters by this
    },
    identityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Identity",
        required: [true, "Identity ID is required"]
    },
    identityDeepening: {
        title: { type: String },
        message: { type: String },
        suggestedHabit: {
            name: { type: String },
            rationale: { type: String }
        } // nullable — AI may have nothing meaningful to add
    },
    habitSuggestions: [
        {
            habitId: { type: mongoose.Schema.Types.ObjectId, ref: "Habit" },
            habitName: { type: String }, // snapshot so the text still makes sense if the habit is later renamed/archived
            category: { type: String, enum: ["consistency", "improvement"] },
            title: { type: String },
            message: { type: String }
        }
    ],
    insightPayloadSnapshot: { type: Object } // what was actually sent to the AI — for debugging/auditability only, never shown to the user
}, {
    timestamps: true
});

// compound index: ownership-scoped history sorted by recency — matches the GET history query exactly
aiSuggestionSchema.index({ userId: 1, identityId: 1, createdAt: -1 });

const AISuggestion = clusterConnection.model("AISuggestion", aiSuggestionSchema);
export default AISuggestion;

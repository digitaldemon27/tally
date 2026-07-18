import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";

// Define the schema for a Scorecard entry
const scorecardEntrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"] // ownership field — every query filters by this
    },
    note: {
        type: String,
        required: [true, "Note is required"],
        trim: true // the behavior text the user typed
    },
    label: {
        type: String,
        required: [true, "Label is required"],
        enum: ["positive", "negative", "neutral"] // stored as words, not symbols
    },
    date: {
        type: Date,
        required: [true, "Date is required"] // calendar day this entry belongs to, normalized to midnight UTC — separate from createdAt
    }
}, {
    // adds createdAt/updatedAt for exact audit timestamps, separate from date
    timestamps: true
});

// Compound index on userId + date — these two fields are used together in every query in this feature,
// so indexing them together gives fast, targeted lookups instead of a full collection scan.
scorecardEntrySchema.index({ userId: 1, date: 1 });

const ScorecardEntry = clusterConnection.model("ScorecardEntry", scorecardEntrySchema);
export default ScorecardEntry;

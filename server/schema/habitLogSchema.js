import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";

// Define the Schema for HabitLog (Vote)
const habitLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"] // for ownership verification on every query
  },
  identityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Identity",
    required: [true, "Identity ID is required"]
  },
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Habit",
    required: [true, "Habit ID is required"]
  },
  date: {
    type: Date,
    required: [true, "Date is required"] // represents the calendar day the vote was cast, normalized to midnight UTC (00:00:00.000Z). Do NOT store exact vote time here.
  },
  note: {
    type: String,
    trim: true // optional user's remark on the vote
  }
}, {
  // adds createdAt/updatedAt for exact audit timestamps, separate from date
  timestamps: true
});

// Compound unique index on habitId and date
// enforces one vote per habit per calendar day at the database level, preventing race-condition duplicates.
habitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });

// for lightning speed query searching logs per user  ,Get logs of an identity for a specific user so using compound indexing will be greate choice here.
habitLogSchema.index({ userId: 1, identityId: 1 });


const HabitLog = clusterConnection.model("HabitLog", habitLogSchema);
export default HabitLog;

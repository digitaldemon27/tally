import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";

// Define the Schema for Habit
const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
  },
  identityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Identity",
    required: [true, "Identity ID is required"]
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index on identityId and name
habitSchema.index({ identityId: 1, name: 1 }, { unique: true });

const Habit = clusterConnection.model("Habit", habitSchema);
export default Habit;

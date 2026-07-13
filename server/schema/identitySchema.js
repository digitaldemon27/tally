import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";

// Define the Schema for Identity
const identitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
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

// Compound unique index on userId and name
identitySchema.index({ userId: 1, name: 1 }, { unique: true });

const Identity = clusterConnection.model("Identity", identitySchema);
export default Identity;

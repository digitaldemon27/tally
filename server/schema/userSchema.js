import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    validate: {
      validator: function (v) {
        // Must not contain any spaces and must not contain any uppercase letters
        return typeof v === "string" && !/\s/.test(v) && !/[A-Z]/.test(v);
      },
      message: "Username must be all lowercase and must not contain spaces."
    }
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    set: function (v) {
      if (typeof v !== "string") return v;
      let emailVal = v.trim().toLowerCase();
      // If there is no '@' (no extension/domain), add '@gmail.com' by default
      if (!emailVal.includes("@")) {
        emailVal = `${emailVal}@gmail.com`;
      }
      return emailVal;
    },
    validate: {
      validator: function (v) {
        // Simple regex validation for email structure (e.g. name@domain.ext)
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Please enter a valid email address."
    }
  },
  is_email_verified: {
    type: Boolean,
    default: false
  },
  local_time_zone: {
    type: String,
    default: "UTC"
  },
  hashed_password: {
    type: String,
    //added select: false so the hashed password is not leaked in default queries
    select: false,
    required: [true, "Password is required"]
  },
  is_active: {
    type: Boolean,
    default: true
  },
  refresh_token: {
    type: String
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

const User = clusterConnection.model("User", userSchema);
export default User;

import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";
import { usernameRegex, emailRegex } from "../validators/signupValidator.js";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    validate: {
      validator: function (v) {
        return typeof v === "string" && usernameRegex.test(v);
      },
      message: "Username must be 3–30 characters long and may contain letters, numbers, dots (.), underscores (_) and hyphens (-). It cannot start or end with a special character or contain consecutive special characters."
    }
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        return typeof v === "string" && emailRegex.test(v);
      },
      message: "Please enter a valid email address."
    }
  },
  is_email_verified: {
    type: Boolean,
    default: false
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
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

const User = clusterConnection.model("User", userSchema);
export default User;

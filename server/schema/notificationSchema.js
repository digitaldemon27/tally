import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Notification = clusterConnection.model("Notification", notificationSchema);
export default Notification;

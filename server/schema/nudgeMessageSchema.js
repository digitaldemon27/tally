import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";

const nudgeMessageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Sender ID is required"] // the buddy sending the nudge
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Receiver ID is required"] // the owner receiving the nudge
    },
    identityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Identity",
        required: [true, "Identity ID is required"] // disambiguates which shared identity this nudge relates to, since the same two users could be paired across multiple identities
    },
    message: {
        type: String,
        required: [true, "Message is required"],
        trim: true // free-text nudge content
    }
}, {
    // createdAt is used directly as the message's timestamp — no separate date field needed
    timestamps: true
});

// supports the owner's "view nudges for this identity, most recent first" query
// this is a rolling message feed — NOT filtered to same-day-only
nudgeMessageSchema.index({ receiverId: 1, identityId: 1, createdAt: -1 });

const NudgeMessage = clusterConnection.model("NudgeMessage", nudgeMessageSchema);
export default NudgeMessage;

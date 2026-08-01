import mongoose from "mongoose";
import { clusterConnection } from "../config/dbConfig.js";

const buddyPairingSchema = new mongoose.Schema({
    ownerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner user ID is required"] // whose identity is being shared
    },
    identityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Identity",
        required: [true, "Identity ID is required"] // which identity this pairing is scoped to
    },
    buddyUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null // null while pending, set when the buddy claims the link
    },
    token: {
        type: String,
        required: [true, "Token is required"] // random string used in the shareable claim link
    },
    status: {
        type: String,
        enum: ["pending", "active", "revoked"],
        required: true,
        default: "pending" // pairing lifecycle state
    }
}, {
    timestamps: true
});

// Partial unique index: allows only one non-revoked pairing (pending OR active) per owner+identity, while preserving revoked history.
buddyPairingSchema.index(
    { ownerUserId: 1, identityId: 1 },
    { unique: true, partialFilterExpression: { status: { $ne: "revoked" } } }
);

// lookup key for the claim endpoint
buddyPairingSchema.index({ token: 1 }, { unique: true });

// supports the buddy's dashboard query (GET /api/buddy) — read-heavy relative to how rarely pairings are created
buddyPairingSchema.index({ buddyUserId: 1 });

const BuddyPairing = clusterConnection.model("BuddyPairing", buddyPairingSchema);
export default BuddyPairing;

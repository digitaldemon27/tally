import BuddyPairing from "../../schema/buddyPairingSchema.js";
import NudgeMessage from "../../schema/nudgeMessageSchema.js";
import mongoose from "mongoose";

// DELETE /api/buddy/:identityId
export const revokeBuddyController = async (req, res) => {
    const { identityId } = req.params;
    const ownerUserId = req.user.id || req.user.userId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // delete all nudge history tied to this pairing first
        await NudgeMessage.deleteMany({ identityId, receiverId: ownerUserId }, { session });

        // delete the pairing itself — ownership check combined directly into the filter
        const result = await BuddyPairing.deleteOne({ identityId, ownerUserId }, { session });

        // if 0 — pairing didn't exist or wasn't owned by this user
        // aborting automatically rolls back the message deletion too
        if (result.deletedCount === 0) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Buddy pairing not found"
            });
        }

        await session.commitTransaction();

        // NOTE: no notification is sent to the revoked buddy here.
        // notifying the revoked buddy is explicitly deferred to the future general notification system
        // (the same one that will eventually handle vote reminders) — this is not an oversight.

        return res.status(200).json({
            success: true,
            message: "Buddy revoked and all nudge history cleared"
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("error occurred while revoking buddy:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    } finally {
        session.endSession();
    }
};

import BuddyPairing from "../../schema/buddyPairingSchema.js";
import NudgeMessage from "../../schema/nudgeMessageSchema.js";
import Notification from "../../schema/notificationSchema.js";
import Identity from "../../schema/identitySchema.js";
import mongoose from "mongoose";

// DELETE /api/buddy/:identityId
export const revokeBuddyController = async (req, res) => {
    const { identityId } = req.params;
    const userId = req.user.id || req.user.userId;

    try {
        const pairing = await BuddyPairing.findOne({
            identityId,
            status: "active",
            $or: [{ ownerUserId: userId }, { buddyUserId: userId }]
        });

        if (!pairing) {
            return res.status(404).json({
                success: false,
                message: "Active buddy pairing not found"
            });
        }

        const isOwner = pairing.ownerUserId.toString() === userId.toString();
        const otherPartyId = isOwner ? pairing.buddyUserId : pairing.ownerUserId;

        const identity = await Identity.findById(identityId);
        const identityName = identity ? identity.name : "an identity";

        // Soft delete pairing — preserve nudge history and change status to 'revoked'
        pairing.status = "revoked";
        await pairing.save();

        // Notify the other party
        if (otherPartyId) {
          await Notification.create({
            userId: otherPartyId,
            message: `Your buddy pairing for "${identityName}" has ended.`,
            read: false
          });
        }

        return res.status(200).json({
            success: true,
            message: "Buddy pairing revoked successfully"
        });

    } catch (error) {
        console.error("Error occurred while revoking buddy:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

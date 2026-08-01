import BuddyPairing from "../../schema/buddyPairingSchema.js";
import Identity from "../../schema/identitySchema.js";

// GET /api/buddy/history/:identityId
export const getBuddyHistoryController = async (req, res) => {
    const { identityId } = req.params;
    const ownerUserId = req.user.id || req.user.userId;

    try {
        const identity = await Identity.findOne({ _id: identityId, userId: ownerUserId });
        if (!identity) {
            return res.status(404).json({
                success: false,
                message: "Identity not found"
            });
        }

        const pairings = await BuddyPairing.find({ ownerUserId, identityId })
            .populate("buddyUserId", "username email")
            .sort({ createdAt: -1 });

        const history = pairings.map(p => ({
            pairingId: p._id,
            identityId: p.identityId,
            buddyUserId: p.buddyUserId?._id || p.buddyUserId,
            buddyUsername: p.buddyUserId?.username || "Invited Buddy",
            status: p.status, // "pending", "active", "revoked"
            pairedAt: p.createdAt,
            updatedAt: p.updatedAt
        }));

        return res.status(200).json({
            success: true,
            history
        });

    } catch (error) {
        console.error("Error fetching buddy history:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

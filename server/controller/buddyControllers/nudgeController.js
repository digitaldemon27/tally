import BuddyPairing from "../../schema/buddyPairingSchema.js";
import NudgeMessage from "../../schema/nudgeMessageSchema.js";

// POST /api/buddy/message/:identityId
export const sendNudgeController = async (req, res) => {
    const { identityId } = req.params;
    const { message } = req.body;
    const buddyUserId = req.user.id || req.user.userId;

    try {
        // single query: verifies buddy has active access AND gives us the receiver's ID — no separate lookup
        const pairing = await BuddyPairing.findOne({ identityId, buddyUserId, status: "active" });

        // generic rejection — don't reveal whether the identity doesn't exist, isn't shared, or pairing is inactive
        if (!pairing) {
            return res.status(404).json({
                success: false,
                message: "Not found"
            });
        }

        // create the nudge message — createdAt from timestamps acts as the message's delivery timestamp
        const nudge = await NudgeMessage.create({
            senderId: buddyUserId,
            receiverId: pairing.ownerUserId,
            identityId,
            message
        });

        return res.status(201).json({
            success: true,
            nudge
        });

    } catch (error) {
        console.error("error occurred while sending nudge:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

// GET /api/buddy/messages/:identityId
export const getReceivedNudgesController = async (req, res) => {
    const { identityId } = req.params;
    // receiverId = the owner viewing their own inbox — no BuddyPairing lookup needed, no cross-user access
    const receiverId = req.user.id || req.user.userId;

    try {
        // sorted most-recent-first, no date scoping — this is a rolling message feed
        const messages = await NudgeMessage
            .find({ receiverId, identityId })
            .sort({ createdAt: -1 });

        // empty array is valid — no nudges received for this identity yet
        return res.status(200).json({
            success: true,
            messages
        });

    } catch (error) {
        console.error("error occurred while fetching nudges:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

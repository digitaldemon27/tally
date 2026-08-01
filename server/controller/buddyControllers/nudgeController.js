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
    const receiverId = req.user.id || req.user.userId;

    try {
        const rawMessages = await NudgeMessage
            .find({ receiverId, identityId })
            .populate("senderId", "username")
            .sort({ createdAt: -1 });

        const pairings = await BuddyPairing.find({ ownerUserId: receiverId, identityId }).populate("buddyUserId", "username");

        const messages = rawMessages.map(msg => {
            const msgObj = msg.toObject();
            const senderIdStr = (msg.senderId?._id || msg.senderId)?.toString();
            const matchingPairing = pairings.find(p => {
                const bId = p.buddyUserId?._id ? p.buddyUserId._id.toString() : p.buddyUserId?.toString();
                return bId === senderIdStr;
            });

            return {
                _id: msgObj._id,
                identityId: msgObj.identityId,
                senderId: senderIdStr,
                senderUsername: msg.senderId?.username || "Past Buddy",
                message: msgObj.message,
                createdAt: msgObj.createdAt,
                pairingStatus: matchingPairing ? matchingPairing.status : "revoked"
            };
        });

        return res.status(200).json({
            success: true,
            messages
        });

    } catch (error) {
        console.error("Error occurred while fetching nudges:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

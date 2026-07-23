import BuddyPairing from "../../schema/buddyPairingSchema.js";
import Identity from "../../schema/identitySchema.js";
import { generateToken } from "../../services/tokenService.js";

// POST /api/buddy/:identityId/generate-link
export const generateLinkController = async (req, res) => {
    const { identityId } = req.params;
    const ownerUserId = req.user.id || req.user.userId;

    try {
        // confirm this identity actually belongs to the requesting user before generating any link
        const identity = await Identity.findOne({ _id: identityId, userId: ownerUserId });
        if (!identity) {
            return res.status(404).json({
                success: false,
                message: "Identity not found"
            });
        }

        // reuse the same token generator already used for email verification tokens
        const newToken = generateToken();

        // single upsert: if a pending pairing exists for this owner+identity, just rotate the token
        // if nothing exists yet, create a fresh pending pairing document
        const pairing = await BuddyPairing.findOneAndUpdate(
            { ownerUserId, identityId, status: "pending" },
            { $set: { token: newToken }, $setOnInsert: { ownerUserId, identityId, status: "pending" } },
            { upsert: true, new: true }
        );

        // construct the shareable claim link the owner can send to their buddy
        const claimLink = `${process.env.FRONTEND_URL}/buddy/claim/${pairing.token}`;

        return res.status(200).json({
            success: true,
            claimLink
        });

    } catch (error) {
        // 11000 = MongoDB duplicate key error — happens when an ACTIVE pairing already exists for this owner+identity
        // the upsert's insert path collides with the unique { ownerUserId, identityId } index
        // this means the user already has an active buddy for this identity and must revoke it first
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You already have an active buddy for this identity. Revoke the current one before generating a new link."
            });
        }

        console.error("error occurred while generating buddy link:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

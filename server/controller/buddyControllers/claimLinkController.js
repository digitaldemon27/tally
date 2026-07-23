import BuddyPairing from "../../schema/buddyPairingSchema.js";

// POST /api/buddy/claim/:token
export const claimLinkController = async (req, res) => {
    const { token } = req.params;
    const buddyUserId = req.user.id || req.user.userId;

    try {
        // single atomic operation: look up by token + pending status, set buddyUserId and flip to active
        const pairing = await BuddyPairing.findOneAndUpdate(
            { token, status: "pending" },
            { buddyUserId, status: "active" },
            { new: true }
        );

        // null here means the token doesn't exist OR it was already claimed before
        if (!pairing) {
            return res.status(409).json({
                success: false,
                message: "This link has already been claimed."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Buddy link claimed successfully",
            identityId: pairing.identityId,
            ownerUserId: pairing.ownerUserId
        });

    } catch (error) {
        console.error("error occurred while claiming buddy link:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

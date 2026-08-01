import BuddyPairing from "../../schema/buddyPairingSchema.js";

// POST /api/buddy/claim/:token
export const claimLinkController = async (req, res) => {
    const { token } = req.params;
    const buddyUserId = req.user.id || req.user.userId;

    try {
        const existing = await BuddyPairing.findOne({ token, status: "pending" });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "This invite link is invalid or no longer available."
            });
        }

        if (existing.ownerUserId.toString() === buddyUserId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot be your own buddy."
            });
        }

        const pairing = await BuddyPairing.findOneAndUpdate(
            { token, status: "pending" },
            { buddyUserId, status: "active" },
            { new: true }
        );

        if (!pairing) {
            return res.status(409).json({
                success: false,
                message: "This link has already been claimed."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Buddy link claimed successfully",
            pairing
        });

    } catch (error) {
        console.error("Error occurred while claiming buddy link:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

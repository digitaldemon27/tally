import BuddyPairing from "../../schema/buddyPairingSchema.js";
import mongoose from "mongoose";

// GET /api/buddy
export const getBuddyDashboardController = async (req, res) => {
    const buddyUserId = req.user.id || req.user.userId;

    try {
        // casting to ObjectId because aggregation pipelines bypass Mongoose type coercion
        const pairings = await BuddyPairing.aggregate([
            { $match: { buddyUserId: new mongoose.Types.ObjectId(buddyUserId) } },
            {
                $lookup: {
                    from: "users",       // User model collection name
                    localField: "ownerUserId",
                    foreignField: "_id",
                    as: "owner"
                }
            },
            {
                $lookup: {
                    from: "identities",  // Identity model collection name
                    localField: "identityId",
                    foreignField: "_id",
                    as: "identity"
                }
            },
            { $unwind: "$owner" },
            { $unwind: "$identity" },
            {
                $project: {
                    identityId: 1,
                    ownerName: "$owner.username", // User schema uses "username" not "name"
                    identityName: "$identity.name"
                }
            }
        ]);

        // an empty array is perfectly valid — the buddy just hasn't claimed any links yet
        return res.status(200).json({
            success: true,
            pairings
        });

    } catch (error) {
        console.error("error occurred while fetching buddy dashboard:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

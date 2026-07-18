import HabitLog from "../../schema/habitLogSchema.js";
import mongoose from "mongoose";
import { validateObjectId } from "../../utils/validation.js";
import { computeMissedYesterday } from "./nmtStatusController.js";

// GET /votes/summary
export const getVoteSummary = async (req, res) => {
    const { habitId } = req.query;
    const userId = req.user.id || req.user.userId;

    // validate habitId is present and is a valid MongoDB ObjectId format before hitting the pipeline
    if (!habitId) {
        return res.status(400).json({
            success: false,
            message: "habitId query parameter is required"
        });
    }

    if (!validateObjectId(habitId, res, "habit")) return;

    // Compute date windows server-side, normalized to midnight UTC
    // 29 days back gives a 30-day inclusive window (today + 29 previous days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    // 6 days back gives a 7-day inclusive window (today + 6 previous days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

    try {
        // casting to ObjectId because aggregation pipelines bypass Mongoose type coercion — without this, the string would never match a BSON ObjectId stored in DB
        const habitObjectId = new mongoose.Types.ObjectId(habitId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const result = await HabitLog.aggregate([
            { $match: { userId: userObjectId, habitId: habitObjectId } }, // no date bound — need all-time data
            {
                $facet: {
                    last7Days: [
                        { $match: { date: { $gte: sevenDaysAgo } } }
                    ],
                    last30Days: [
                        { $match: { date: { $gte: thirtyDaysAgo } } },
                        { $count: "count" }
                    ],
                    allTime: [
                        { $count: "count" }
                    ]
                }
            }
        ]);

        // Unwrap safely with null coalescing — a non-existent or non-owned habitId naturally resolves to 0, not an error.
        const last7DaysLogs = result[0].last7Days ?? [];
        const weeklyCount = last7DaysLogs.length;
        const monthlyCount = result[0].last30Days[0]?.count ?? 0;
        const totalVotes = result[0].allTime[0]?.count ?? 0;

        const missedYesterday = computeMissedYesterday(last7DaysLogs);

        return res.status(200).json({
            success: true,
            totalVotes,
            weeklyCount,
            monthlyCount,
            missedYesterday
        });

    } catch (error) {
        console.error("error occurred while fetching vote summary:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

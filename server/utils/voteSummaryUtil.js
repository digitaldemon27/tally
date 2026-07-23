import HabitLog from "../schema/habitLogSchema.js";
import Habit from "../schema/habitSchema.js";
import mongoose from "mongoose";
import { computeMissedYesterday } from "../controller/VoteControllers/nmtStatusController.js";

// core vote summary logic extracted from the getVoteSummary controller so the Buddy System can call it
// for a different user (the identity owner) without duplicating this code in two places
export const getVoteSummaryForHabit = async (habitId, userId) => {
    // Compute date windows server-side, normalized to midnight UTC
    // 29 days back gives a 30-day inclusive window (today + 29 previous days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    // 6 days back gives a 7-day inclusive window (today + 6 previous days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

    // casting to ObjectId because aggregation pipelines bypass Mongoose type coercion — without this, the string would never match a BSON ObjectId stored in DB
    const habitObjectId = new mongoose.Types.ObjectId(habitId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // fetch habit to get createdAt for rolling consistency and verify ownership
    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) return null; // caller decides what to do with a null result

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

    // Unwrap safely — a non-existent or non-owned habitId naturally resolves to 0, not an error
    const last7DaysLogs = result[0].last7Days ?? [];
    const weeklyCount = last7DaysLogs.length;
    const monthlyCount = result[0].last30Days[0]?.count ?? 0;
    const totalVotes = result[0].allTime[0]?.count ?? 0;

    // using server-UTC today for NMT — timezone-aware follow-up is deferred (see getVoteSummaryController TODO)
    const serverToday = new Date();
    serverToday.setUTCHours(0, 0, 0, 0);
    const missedYesterday = computeMissedYesterday(last7DaysLogs, serverToday);

    // Compute Rolling Consistency
    const createdDate = new Date(habit.createdAt);
    createdDate.setUTCHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysBetween = Math.max(0, Math.floor((serverToday.getTime() - createdDate.getTime()) / msPerDay));
    // activeDays is capped at 30, and +1 makes it inclusive of the creation day (never 0)
    const activeDays = Math.min(30, daysBetween + 1);
    const rollingConsistency = Math.round((monthlyCount / activeDays) * 100);

    return { weeklyCount, monthlyCount, totalVotes, missedYesterday, rollingConsistency };
};

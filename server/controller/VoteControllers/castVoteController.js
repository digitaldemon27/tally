import HabitLog from "../../schema/habitLogSchema.js";
import Habit from "../../schema/habitSchema.js";

// POST /votes
export const castVote = async (req, res) => {
    const { identityId, habitId, note } = req.body;
    const userId = req.user.id || req.user.userId;

    try {
        // Query Habit to verify it exists, is owned by user, matches identity, and is not archived
        // query the Habit collection first before inserting the vote , To guarantee the habit actually exists, belongs to the current user, matches the provided identity, and is active (not archived).
        const habit = await Habit.findOne({
            _id: habitId,
            userId,
            identityId,
            isArchived: false
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: "Habit not found, does not belong to identity, or is archived"
            });
        }

        // date is computed server-side using the user's timezone (injected by requireTimezone middleware) — never trust client for this
        const date = req.todayForUser;

        // Create HabitLog
        const newVote = await HabitLog.create({
            userId,
            identityId,
            habitId,
            date,
            note
        });

        return res.status(201).json({
            success: true,
            message: "Vote cast successfully",
            vote: newVote
        });

    } catch (error) {
        // Handle MongoDB duplicate key error for the unique compound index { habitId: 1, date: 1 } , if user tries to cast duplicate vote
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "already voted for this habit today"
            });
        }

        console.error("error occurred while casting vote:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

import ScorecardEntry from "../../schema/ScorecardEntry.js";

// GET /scorecard/today
export const getTodayController = async (req, res) => {
    const userId = req.user.id || req.user.userId;

    // use timezone-aware today from middleware — never recompute this manually in the controller
    const todayNormalized = req.todayForUser;

    try {
        // Fetch all of today's entries, sorted by when they were created so they appear in log order
        const entries = await ScorecardEntry
            .find({ userId, date: todayNormalized })
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            entries
        });
    } catch (error) {
        console.error("error occurred while fetching today's scorecard entries:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

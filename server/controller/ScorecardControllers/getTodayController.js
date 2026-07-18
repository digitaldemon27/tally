import ScorecardEntry from "../../schema/ScorecardEntry.js";

// GET /scorecard/today
export const getTodayController = async (req, res) => {
    const userId = req.user.id || req.user.userId;

    // Compute today's date server-side — never trust the client for what "today" means
    const todayNormalized = new Date();
    todayNormalized.setUTCHours(0, 0, 0, 0);

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

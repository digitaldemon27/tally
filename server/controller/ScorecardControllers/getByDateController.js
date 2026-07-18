import ScorecardEntry from "../../schema/ScorecardEntry.js";
import User from "../../schema/userSchema.js";

// GET /scorecard/:date
export const getByDateController = async (req, res) => {
    const userId = req.user.id || req.user.userId;

    // Step 1: Parse the raw date string from the route param
    const parsedDate = new Date(req.params.date);

    // Step 2: Reject right away if the date string wasn't parseable at all
    if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
            success: false,
            message: "Invalid date"
        });
    }

    // Step 3: Normalize the parsed date to midnight UTC — must match how date is stored everywhere else
    parsedDate.setUTCHours(0, 0, 0, 0);

    // Step 4: Compute upper bound (today)
    const todayNormalized = new Date();
    todayNormalized.setUTCHours(0, 0, 0, 0);

    try {
        // Step 5: Fetch the user's account creation date — needed to enforce the lower bound.
        // JWT only carries userId, not createdAt, so a separate User query is necessary here.
        // Q: Why not a $lookup inside the scorecard query?
        // A: These hit two different collections. A $lookup adds complexity for fetching one field off one document. Two simple queries are cleaner.
        const user = await User.findOne({ _id: userId }).select("createdAt");

        // Normalize account creation date to midnight UTC before comparing
        const normalizedAccountCreation = new Date(user.createdAt);
        normalizedAccountCreation.setUTCHours(0, 0, 0, 0);

        // Step 6: Reject dates before account was created, or in the future — only dates where data could possibly exist
        if (parsedDate < normalizedAccountCreation || parsedDate > todayNormalized) {
            return res.status(400).json({
                success: false,
                message: "Date out of range"
            });
        }

        // Step 7: Fetch entries for that date, sorted ascending by creation time
        const entries = await ScorecardEntry
            .find({ userId, date: parsedDate })
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            entries
        });
    } catch (error) {
        console.error("error occurred while fetching scorecard entries by date:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

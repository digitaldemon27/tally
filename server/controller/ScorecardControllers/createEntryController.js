import ScorecardEntry from "../../schema/ScorecardEntry.js";

// POST /scorecard
export const createEntryController = async (req, res) => {
    // note and label are already validated by Zod middleware — safe to destructure directly
    const { note, label } = req.body;
    const userId = req.user.id || req.user.userId;

    // Compute today's date server-side, normalized to midnight UTC — never trust client for this
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);

    try {
        // Duplicates are allowed by design — no uniqueness check before creating
        const entry = await ScorecardEntry.create({ userId, note, label, date });

        return res.status(201).json({
            success: true,
            entry
        });
    } catch (error) {
        console.error("error occurred while creating scorecard entry:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

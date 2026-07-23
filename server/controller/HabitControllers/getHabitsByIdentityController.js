import { validateObjectId } from "../../utils/validation.js";
import { getHabitsForIdentity } from "../../utils/habitListUtil.js";

// Fetch habits matching identity and user constraints
export const getHabitsByIdentity = async (req, res) => {
    const { identityId } = req.params;
    const userId = req.user.userId || req.user.id;
    const { archived } = req.query;

    if (!identityId) {
        return res.status(400).json({
            success: false,
            message: "missing parameters"
        });
    }

    if (!validateObjectId(identityId, res, "identity")) return;

    try {
        // delegate to the shared util — same logic, just accepts plain params instead of req
        // archived param is only used in the owner-facing route, not in the buddy system's call path
        let habits;
        if (archived === "true") {
            const { default: Habit } = await import("../../schema/habitSchema.js");
            habits = await Habit.find({ identityId, userId, isArchived: true });
        } else {
            habits = await getHabitsForIdentity(identityId, userId);
        }

        return res.status(200).json(habits);
    } catch (error) {
        console.error("error occurred while fetching habits for identity:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

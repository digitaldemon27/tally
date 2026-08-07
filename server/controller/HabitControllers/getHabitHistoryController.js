import { validateObjectId } from "../../utils/validation.js";
import { buildHabitHistory } from "../../services/habitHistoryService.js";

/**
 * GET /api/habits/:id/history
 * Returns a UI-ready DTO for the Consistency Visualization panel.
 * Thin controller — all computation is in habitHistoryService.
 */
export const getHabitHistory = async (req, res) => {
  const { id: habitId } = req.params;
  const userId   = req.user.userId || req.user.id;
  const timezone = req.headers['x-timezone'] || null;   // optional; service falls back to UTC

  if (!validateObjectId(habitId, res, "habit")) return;

  try {
    const dto = await buildHabitHistory(habitId, userId, timezone);

    if (!dto) {
      return res.status(404).json({
        success: false,
        message: "Habit not found or does not belong to you."
      });
    }

    return res.status(200).json({ success: true, data: dto });

  } catch (err) {
    console.error("getHabitHistory error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

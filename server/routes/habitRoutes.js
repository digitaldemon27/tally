import express from "express";
import validate from "../middleware/validate.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { habitNameSchema } from "../validators/habitValidator.js";
import { createHabitController } from "../controller/HabitControllers/createHabitController.js";
import { validateObjectId } from "../Middleware/validateObjectId.js";
import { getHabitById } from "../controller/HabitControllers/getHabitByIdController.js";
import { getAllUserHabits } from "../controller/HabitControllers/getAllHabitsController.js";
import { deleteBulkHabits } from "../controller/HabitControllers/deleteHabitController.js";
import { archiveHabitToggle, archiveBulkHabits } from "../controller/HabitControllers/archiveHabitController.js";
import { updateHabit } from "../controller/HabitControllers/updateHabitController.js";
import { getHabitsByIdentity } from "../controller/HabitControllers/getHabitsByIdentityController.js";
import { getHabitHistory } from "../controller/HabitControllers/getHabitHistoryController.js";
const router = express.Router({ mergeParams: true });

router.post("/", authenticateJWT, validate(habitNameSchema), createHabitController);
router.get("/", authenticateJWT, (req, res, next) => {
  if (req.params.identityId) {
    return getHabitsByIdentity(req, res, next);
  }
  return getAllUserHabits(req, res, next);
});
router.patch("/archive", authenticateJWT, archiveBulkHabits);
router.get("/:id/history", authenticateJWT, validateObjectId, getHabitHistory);
router.get("/:id", authenticateJWT, validateObjectId, getHabitById);
router.patch("/:id", authenticateJWT, validateObjectId, updateHabit);
router.patch("/:id/archive", authenticateJWT, validateObjectId, archiveHabitToggle);
router.delete("/", authenticateJWT, deleteBulkHabits);

export default router;

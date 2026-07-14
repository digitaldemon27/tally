import express from "express";
import validate from "../middleware/validate.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { habitNameSchema } from "../validators/habitValidator.js";
import { createHabitController } from "../controller/HabitControllers/createHabit.js";

const router = express.Router();

router.post("/", authenticateJWT, validate(habitNameSchema), createHabitController);

export default router;

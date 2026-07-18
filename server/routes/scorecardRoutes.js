import express from "express";
import { authenticateJWT } from "../Middleware/authenticate.js";
import validate from "../Middleware/validate.js";
import { createEntrySchema, editEntrySchema } from "../validators/scorecard.validator.js";
import { createEntryController } from "../controller/ScorecardControllers/createEntryController.js";
import { editEntryController } from "../controller/ScorecardControllers/editEntryController.js";
import { deleteEntryController } from "../controller/ScorecardControllers/deleteEntryController.js";
import { getTodayController } from "../controller/ScorecardControllers/getTodayController.js";
import { getByDateController } from "../controller/ScorecardControllers/getByDateController.js";

const router = express.Router();

router.post("/", authenticateJWT, validate(createEntrySchema), createEntryController);
router.patch("/:entryId", authenticateJWT, validate(editEntrySchema), editEntryController);
router.delete("/:entryId", authenticateJWT, deleteEntryController);

// /today MUST be registered before /:date — Express matches top-to-bottom, and /:date would capture
// the literal string "today" as a param value if this order were reversed, breaking this route entirely.
router.get("/today", authenticateJWT, getTodayController);
router.get("/:date", authenticateJWT, getByDateController);

export default router;

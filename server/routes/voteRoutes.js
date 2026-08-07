import express from "express";
import validate from "../middleware/validate.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { validateObjectId } from "../Middleware/validateObjectId.js";
import { castVoteSchema, editVoteSchema } from "../validators/vote.validator.js";
import { castVote } from "../controller/VoteControllers/castVoteController.js";
import { deleteVote, deleteTodayVote } from "../controller/VoteControllers/deleteVoteController.js";
import { editVote } from "../controller/VoteControllers/editVoteController.js";
import { getVoteSummary } from "../controller/VoteControllers/getVoteSummaryController.js";
import { requireTimezone } from "../Middleware/requireTimezone.js";

const router = express.Router();

// POST /votes - Cast Vote
router.post("/", authenticateJWT, requireTimezone, validate(castVoteSchema), castVote);

// GET /votes/summary - Weekly and Monthly Vote Summary (must be defined before /:id to avoid Express matching "summary" as an id param)
router.get("/summary", authenticateJWT, requireTimezone, getVoteSummary);

// DELETE /votes/today - Remove today's vote for a habit (reversible process)
router.delete("/today", authenticateJWT, requireTimezone, deleteTodayVote);

// DELETE /votes/:id - Delete Vote
router.delete("/:id", authenticateJWT, requireTimezone, validateObjectId, deleteVote);

// PATCH /votes/:id - Edit Vote
router.patch("/:id", authenticateJWT, requireTimezone, validateObjectId, validate(editVoteSchema), editVote);

export default router;

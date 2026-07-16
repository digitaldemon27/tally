import express from "express";
import validate from "../middleware/validate.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { validateObjectId } from "../Middleware/validateObjectId.js";
import { castVoteSchema, editVoteSchema } from "../validators/vote.validator.js";
import { castVote } from "../controller/VoteControllers/castVoteController.js";
import { deleteVote } from "../controller/VoteControllers/deleteVoteController.js";
import { editVote } from "../controller/VoteControllers/editVoteController.js";
import { getVoteSummary } from "../controller/VoteControllers/getVoteSummaryController.js";

const router = express.Router();

// POST /votes - Cast Vote
router.post("/", authenticateJWT, validate(castVoteSchema), castVote);

// GET /votes/summary - Weekly and Monthly Vote Summary (must be defined before /:id to avoid Express matching "summary" as an id param)
router.get("/summary", authenticateJWT, getVoteSummary);

// DELETE /votes/:id - Delete Vote
router.delete("/:id", authenticateJWT, validateObjectId, deleteVote);

// PATCH /votes/:id - Edit Vote
router.patch("/:id", authenticateJWT, validateObjectId, validate(editVoteSchema), editVote);

export default router;

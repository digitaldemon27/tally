import express from "express";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { validateParams } from "../Middleware/validate.js";
import { identityIdParamSchema } from "../schema/AISuggestionsSchema.js";
import { generateSuggestions, getSuggestionHistory } from "../controller/AISuggestionControllers/AISuggestionsController.js";

const router = express.Router();

// generate + persist a new suggestion set for an identity (triggers AI call)
// validateParams runs before the controller — a malformed :identityId returns 400 and never reaches Identity.findOne()
router.post("/:identityId/generate", authenticateJWT, validateParams(identityIdParamSchema), generateSuggestions);

// fetch suggestion history for an identity — same param risk, same guard
router.get("/:identityId", authenticateJWT, validateParams(identityIdParamSchema), getSuggestionHistory);

export default router;

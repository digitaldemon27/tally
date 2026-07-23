import express from "express";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { validateObjectId } from "../Middleware/validateObjectId.js";
import validate from "../middleware/validate.js";
import { sendNudgeSchema } from "../validators/buddy.validator.js";
import { generateLinkController } from "../controller/buddyControllers/generateLinkController.js";
import { claimLinkController } from "../controller/buddyControllers/claimLinkController.js";
import { getBuddyDashboardController } from "../controller/buddyControllers/getBuddyDashboardController.js";
import { viewPartnerDataController } from "../controller/buddyControllers/viewPartnerDataController.js";
import { revokeBuddyController } from "../controller/buddyControllers/revokeBuddyController.js";
import { sendNudgeController, getReceivedNudgesController } from "../controller/buddyControllers/nudgeController.js";

const router = express.Router();

// generate/rotate the shareable claim link for a specific identity (owner action)
router.post("/:identityId/generate-link", authenticateJWT, validateObjectId, generateLinkController);

// claim a link using its token (buddy action) — token is a random string, not an ObjectId, no ObjectId middleware needed
router.post("/claim/:token", authenticateJWT, claimLinkController);

// send a nudge message to an identity's owner (buddy action)
router.post("/message/:identityId", authenticateJWT, validateObjectId, validate(sendNudgeSchema), sendNudgeController);

// owner views received nudge messages for a specific identity
router.get("/messages/:identityId", authenticateJWT, validateObjectId, getReceivedNudgesController);

// list all identities this user is a buddy for (buddy's dashboard) — bare / registered before /:identityId so Express matches correctly
router.get("/", authenticateJWT, getBuddyDashboardController);

// view one partner's habit data for a specific identity (buddy action)
router.get("/:identityId", authenticateJWT, validateObjectId, viewPartnerDataController);

// revoke the buddy pairing for a specific identity (owner action)
router.delete("/:identityId", authenticateJWT, validateObjectId, revokeBuddyController);

export default router;

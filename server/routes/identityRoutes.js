import express from "express";
import validate from "../middleware/validate.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { identityNameSchema } from "../validators/identityValidator.js";
import { createIdentityContoller } from "../controller/IdentityControllers/createIdentityController.js"
import { getAllIdentities } from "../controller/IdentityControllers/getAllIdentityController.js";
import { getIdentity } from "../controller/IdentityControllers/getIdentityController.js";
import { validateObjectId } from "../Middleware/validateObjectId.js";
import { getHabitsByIdentity } from "../controller/HabitControllers/getHabitsByIdentityController.js";
import { deleteBulkIdentities } from "../controller/IdentityControllers/deleteIdentityController.js";

const router = express.Router();

router.post("/", authenticateJWT, validate(identityNameSchema), createIdentityContoller);
router.get("/", authenticateJWT, getAllIdentities);
router.get("/:id", authenticateJWT, getIdentity);
router.delete("/", authenticateJWT, deleteBulkIdentities);

// Get all habits for a specific identity
router.get("/:identityId/habits", authenticateJWT, validateObjectId, getHabitsByIdentity);

export default router;

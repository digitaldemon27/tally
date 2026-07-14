import express from "express";
import validate from "../middleware/validate.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { identityNameSchema } from "../validators/identityValidator.js";
import { createIdentityContoller } from "../controller/IdentityControllers/createIdentityController.js"
import { getAllIdentities } from "../controller/IdentityControllers/getAllIdentityController.js";
import { getIdentity } from "../controller/IdentityControllers/getIdentityByIdController.js";
import { validateObjectId } from "../Middleware/validateObjectId.js";
import { deleteBulkIdentities } from "../controller/IdentityControllers/deleteIdentityController.js";
import { updateIdentity } from "../controller/IdentityControllers/updateIdentityController.js";
import habitRoutes from "./habitRoutes.js";

const router = express.Router();

router.post("/", authenticateJWT, validate(identityNameSchema), createIdentityContoller);
router.get("/", authenticateJWT, getAllIdentities);
router.get("/:id", authenticateJWT, getIdentity);
router.patch("/:id", authenticateJWT, validateObjectId, updateIdentity);
router.delete("/", authenticateJWT, deleteBulkIdentities);

// Mount the habit router under the specific identity ID
router.use("/:identityId/habits", habitRoutes);

export default router;

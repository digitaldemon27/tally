import express from "express";
import validate from "../middleware/validate.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { identityNameSchema } from "../validators/identityValidator.js";
import { createIdentityContoller } from "../controller/IdentityControllers/createIdentityController.js"
import { getAllIdentities } from "../controller/IdentityControllers/getAllIdentityController.js";
import { getIdentity } from "../controller/IdentityControllers/getIdentityController.js";
const router = express.Router();

router.post("/create-identity", authenticateJWT, validate(identityNameSchema), createIdentityContoller);
router.get("/get-all-indetities", authenticateJWT, getAllIdentities);
router.get("/get-identity/:id", authenticateJWT, getIdentity);
export default router

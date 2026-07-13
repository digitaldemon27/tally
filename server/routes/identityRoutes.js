import express from "express";
import validate from "../middleware/validate.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { identityNameSchema } from "../validators/identityValidator.js";
import { createIdentityContoller } from "../controller/IdentityControllers/createIdentity.js"

const router = express.Router();

router.post("/create-identity", authenticateJWT, validate(identityNameSchema), createIdentityContoller);


export default router

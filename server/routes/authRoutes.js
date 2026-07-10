import express from "express";
import { registerUser } from "../controller/registration.js";
import { verifyTokenStatus } from "../controller/verifySignUpToken.js";
import { setPassword } from "../controller/setPassword.js";
import { refreshToken } from "../controller/authController.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
const router = express.Router();

router.post("/sign-up", registerUser);
router.post("/verify-token", verifyTokenStatus);
router.post("/set-password", setPassword);
router.post("/refresh", refreshToken);

export default router;

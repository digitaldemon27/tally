import express from "express";
import { registerUser } from "../controller/registrationController.js";
import { verifyTokenStatus } from "../controller/verifySignUpTokenController.js";
import { setPassword } from "../controller/setPasswordController.js";
import { refreshToken } from "../controller/authController.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { logoutFromOnedevice, logoutFromAll } from "../controller/logoutControllers.js"
import { login } from "../controller/loginController.js"

const router = express.Router();

router.post("/sign-up", registerUser);
router.post("/verify-token", verifyTokenStatus);
router.post("/set-password", setPassword);
router.post("/refresh", refreshToken);
router.post("/logout-from-current-device", authenticateJWT, logoutFromOnedevice);
router.post("/logout-from-all", authenticateJWT, logoutFromAll);

export default router;

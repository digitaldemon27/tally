import express from "express";
import { registerUser } from "../controller/AuthControllers/registrationController.js";
import { verifyTokenStatus } from "../controller/AuthControllers/verifySignUpTokenController.js";
import { setPassword } from "../controller/AuthControllers/setPasswordController.js";
import { refreshToken } from "../controller/AuthControllers/refreshController.js";
import { authenticateJWT } from "../Middleware/authenticate.js";
import { logoutFromOnedevice, logoutFromAll } from "../controller/AuthControllers/logoutControllers.js"
import { login } from "../controller/AuthControllers/loginController.js"

const router = express.Router();

router.post("/sign-up", registerUser);
router.post("/verify-token", verifyTokenStatus);
router.post("/set-password", setPassword);
router.post("/refresh", refreshToken);
router.post("/logout-from-current-device", logoutFromOnedevice);
router.post("/logout-from-all", authenticateJWT, logoutFromAll);
router.post("/login", login);

export default router;

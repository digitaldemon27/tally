import express from "express";
import { registerUser } from "../controller/registration.js";
import { verifyTokenStatus } from "../controller/verifySignUpToken.js";
import { setPassword } from "../controller/setPassword.js";

const router = express.Router();

router.post("/sign-up", registerUser);
router.post("/verify-token", verifyTokenStatus);
router.post("/set-password", setPassword);

export default router;

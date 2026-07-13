import express from "express"
import authRoutes from "./authRoutes.js"
import habitRoutes from "./habitRoutes.js"
import identityRoutes from "./identityRoutes.js";
const masterRoutes = express.Router();

// Login - sign up routes
masterRoutes.use("/auth", authRoutes);
masterRoutes.use("/habits", habitRoutes);
masterRoutes.use("/identity", identityRoutes);

export default masterRoutes;
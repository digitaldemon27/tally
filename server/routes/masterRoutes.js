import express from "express"
import authRoutes from "./authRoutes.js"
import habitRoutes from "./habitRoutes.js"
import identityRoutes from "./identityRoutes.js";
import voteRoutes from "./vote.routes.js";
const masterRoutes = express.Router();

// Login - sign up routes
masterRoutes.use("/auth", authRoutes);
masterRoutes.use("/habits", habitRoutes);
masterRoutes.use("/identity", identityRoutes);
masterRoutes.use("/votes", voteRoutes);

export default masterRoutes;
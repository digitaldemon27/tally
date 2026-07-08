import express from "express"
import authRoutes from "./authRoutes.js"

const masterRoutes = express.Router();

// Login - sign up routes
masterRoutes.use("/auth", authRoutes);
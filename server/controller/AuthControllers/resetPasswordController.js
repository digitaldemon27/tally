import bcrypt from "bcryptjs";
import redisClient from "../../config/redisConfig.js";
import User from "../../schema/userSchema.js";
import { resetPasswordTokenKey } from "./forgotPasswordController.js";

// Endpoint: POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    try {
        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "token and password are required"
            });
        }

        const pendingKey = resetPasswordTokenKey(token);
        const email = await redisClient.get(pendingKey);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "This password reset link has expired or is invalid."
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Hash new password using bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Update password on user document
        user.hashed_password = hashedPassword;
        await user.save();

        // Delete the reset token from Redis
        await redisClient.del(pendingKey);

        return res.status(200).json({
            success: true,
            message: "Password reset successful! You can now log in."
        });

    } catch (error) {
        console.error("Error in resetPassword:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error encountered while resetting your password."
        });
    }
};

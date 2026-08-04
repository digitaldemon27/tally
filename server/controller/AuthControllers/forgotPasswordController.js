import User from "../../schema/userSchema.js";
import redisClient from "../../config/redisConfig.js";
import { sendResetPasswordEmail } from "../../src/services/mail.service.js";
import { generateToken } from "../../services/tokenService.js";

// Redis key prefix for password reset tokens
export const resetPasswordTokenKey = (token) => `reset_password_token:${token}`;

export const forgotPassword = async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();

    try {
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });
        // Return a successful generic message even if the email doesn't exist
        // to prevent account enumeration / scanning.
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account exists with this email, a reset link has been sent."
            });
        }

        // Generate token and store it in Redis (valid for 60 minutes)
        const token = generateToken();
        const pendingKey = resetPasswordTokenKey(token);
        await redisClient.set(pendingKey, email, { EX: 60 * 60 });

        const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/set-password.html?token=${token}&reset=true`;

        if (process.env.NODE_ENV === "development") {
            console.log("Password Reset Link:", resetLink);
        }

        // Send reset email via Resend
        await sendResetPasswordEmail(email, {
            name: user.username,
            resetUrl: resetLink
        });

        return res.status(200).json({
            success: true,
            message: "If an account exists with this email, a reset link has been sent."
        });

    } catch (error) {
        console.error("Error in forgotPassword:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during password reset request."
        });
    }
};

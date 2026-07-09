import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import redisClient from "../config/redisConfig.js";
import User from "../Schema/userSchema.js";
import { sendOnboardingEmail } from "../src/services/mail.service.js";

// ─── redis name space ────────────────────────────────────────────────────────────
const pendingUserKey = (token) => `auth:pending:${token}`;


// ─────────────────────────────────Token Helpers ──────────────────────────────
const generateAccessToken = (user) =>
    jwt.sign(
        { userId: user._id },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "20m" }
    )

const generateRefreshToken = (user) =>
    jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    )
//after successfully checking the token exists in the redis we will this controller function to set the password
//and save the details in the mongoDB

//endpoint : POST /api/set-password
export const setPassword = async (req, res) => {
    const { token, password, timezone } = req.body;

    try {

        //if any of the field is missing
        if (!token || !password || !timezone) {
            return res.status(400).json({
                success: false,
                message: "Token , password and timezone are required",
            });
        }
        const key = pendingUserKey(token);

        const rawData = await redisClient.get(key);
        if (!rawData) {
            return res.status(400).json({
                success: false,
                message: "This registration link has expired or is invalid.",
            });
        }
        //if the above condition is not true it means the data exists on the redis , now extract it
        //take a note : the data was parsed into JSON we have to parse it back into js object to save it into DB

        //parsing it back
        const { email, username } = JSON.parse(rawData);
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await User.create({
            username,
            email,
            hashed_password: hashedPassword,
            local_time_zone: timezone,
            //fixed : set is_email_verified to true — user reached this endpoint by clicking the verification link, so email is confirmed
            is_email_verified: true
        });

        //removing the redis key 
        await redisClient.del(key);

        //generating the refresh and access token
        const refreshToken = generateRefreshToken(newUser);
        const accessToken = generateAccessToken(newUser);

        // saving the refresh token to the database
        newUser.refresh_token = refreshToken;
        await newUser.save();

        // sending the welcome onboarding mail
        await sendOnboardingEmail(email, { name: username, dashboardUrl: process.env.FRONTEND_URL || 'http://localhost:3000/dashboard' });

        //sending the tokens 
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // true in production
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        });

        // Return success along with the Access Token in JSON
        return res.status(201).json({
            success: true,
            message: "Your account has been created successfully!",
            accessToken,
            user: {
                username: newUser.username,
                email: newUser.email,
                //fix : changed newUser.timezone reference to newUser.local_time_zone
                timezone: newUser.local_time_zone
            }
        });

    } catch (error) {
        console.error("Error finalizing signup:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error encountered while creating your account."
        });
    }
}
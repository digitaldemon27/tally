import bcrypt from "bcryptjs";
import redisClient from "../../config/redisConfig.js";
import User from "../../schema/userSchema.js";
import { sendOnboardingEmail } from "../../src/services/mail.service.js";
import { pendingUserKey, sessionKey, sessionsSetKey, generateSessionId } from "../../services/sessionService.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "../../services/tokenService.js";


//after successfully checking the token exists in redis we use this controller to set the password
//and save the user details in mongoDB

//endpoint : POST /api/set-password
export const setPassword = async (req, res) => {
    const { signupToken, password } = req.body;

    try {

        //if any of the field is missing
        if (!signupToken || !password) {
            return res.status(400).json({
                success: false,
                message: "signupToken and password are required",
            });
        }

        const pendingKey = pendingUserKey(signupToken);

        const rawData = await redisClient.get(pendingKey);
        if (!rawData) {
            return res.status(400).json({
                success: false,
                message: "This registration link has expired or is invalid.",
            });
        }

        //if the above condition is not true it means the data exists on redis, now extract it
        //take a note : the data was parsed into JSON we have to parse it back into js object to save it into DB

        //parsing it back
        const { email, username } = JSON.parse(rawData);
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await User.create({
            username,
            email,
            hashed_password: hashedPassword,
            is_email_verified: true
        });

        //removing the redis pending-signup key now that the user doc exists in mongo
        await redisClient.del(pendingKey);

        //generating a unique session id for this device/login — UUID gives us a
        //random, unguessable identifier that we can store in the refresh token payload
        const sessionId = generateSessionId();

        // stores a usable credential in plaintext. Now generating the token with sessionId
        // in the payload and storing only a hash in a per-session Redis key.
        const refreshToken = generateRefreshToken(newUser._id.toString(), sessionId);
        const accessToken = generateAccessToken(newUser._id.toString());

        //hash the raw refresh token before storing in redis — we never store usable tokens
        const hashedRefreshToken = hashToken(refreshToken);
        //capture a lightweight device hint from the request for auditability
        //if user-agent is absent (e.g. API clients, tests) we store null
        const device = req.headers["user-agent"] || null;

        //store the session in redis with a 30-day TTL matching the refresh token lifespan
        await redisClient.set(
            sessionKey(sessionId),
            JSON.stringify({
                userId: newUser._id.toString(),
                hashedToken: hashedRefreshToken,
                device,
                createdAt: new Date().toISOString(),
            }),
            { EX: 30 * 24 * 60 * 60 } // 30 days in seconds
        );

        //add this sessionId to the user's session set so we can enumerate all active
        //devices for this user (e.g. "log out everywhere" or admin audit)
        //no TTL on the set itself — individual session keys expire on their own
        await redisClient.sAdd(sessionsSetKey(newUser._id.toString()), sessionId);

        //sending the onboarding mail after the successful first time sign up!
        try {
            await sendOnboardingEmail(email, {
                name: username,
                dashboardUrl: process.env.FRONTEND_URL || "http://localhost:3000/dashboard",
            });
        } catch (emailError) {
            //log clearly so the team can investigate/retry, but do not surface this to the user
            console.error("Onboarding email failed to send (account was still created):", emailError);
        }

        //sending the refresh token as an httpOnly cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // true in production
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
        });

        // return success along with the access token in JSON
        return res.status(201).json({
            success: true,
            message: "Your account has been created successfully!",
            accessToken,
            user: {
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error("Error finalizing signup:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error encountered while creating your account."
        });
    }
};
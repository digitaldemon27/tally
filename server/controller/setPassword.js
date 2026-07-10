import bcrypt from "bcryptjs";
import crypto from "crypto";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import redisClient from "../config/redisConfig.js";
import User from "../Schema/userSchema.js";
import { sendOnboardingEmail } from "../src/services/mail.service.js";

// ─── redis namespaces ─────────────────────────────────────────────────────────
const pendingUserKey = (token) => `auth:pending:${token}`;

//session key holds the per-device session data (hashed token, userId, device, createdAt)
const sessionKey = (sessionId) => `session:${sessionId}`;

//sessions set holds all active sessionIds for a given user (used for multi-device logout / audit)
const sessionsSetKey = (userId) => `sessions:${userId}`;


// ─── token helpers ────────────────────────────────────────────────────────────

// fix: access token expiry was "20m" — standardising to "15m" to match the
// intended short-lived access-token design and keep it consistent with refresh.
const generateAccessToken = (userId) =>
    jwt.sign(
        { userId },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
    );

// fix: refresh token now includes sessionId in the payload so we can recover
// which session to revoke during logout without a separate lookup table.
// fix: expiry was "30d" — standardising to "7d" to match the Redis session TTL
// and the cookie maxAge (all three must agree: JWT expiry, Redis TTL, cookie maxAge).
const generateRefreshToken = (userId, sessionId) =>
    jwt.sign(
        { userId, sessionId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    );

//hash a raw string (refresh token) with SHA-256 for safe storage
//we use SHA-256 here rather than bcrypt because the token is already a long random JWT
//and we only need a fast one-way hash for equality checks, not work-factor protection
const hashToken = (rawToken) =>
    crypto.createHash("sha256").update(rawToken).digest("hex");


//after successfully checking the token exists in redis we use this controller to set the password
//and save the user details in mongoDB

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
            local_time_zone: timezone,
            is_email_verified: true
        });

        //removing the redis pending-signup key now that the user doc exists in mongo
        await redisClient.del(key);

        //generating a unique session id for this device/login — UUID gives us a
        //random, unguessable identifier that we can store in the refresh token payload
        const sessionId = randomUUID();

        // fix: refresh token was being stored in plaintext on the Mongo User document,
        // which breaks multi-device support (one field can't hold multiple sessions) and
        // stores a usable credential in plaintext. Now generating the token with sessionId
        // in the payload and storing only a hash in a per-session Redis key.
        const refreshToken = generateRefreshToken(newUser._id.toString(), sessionId);
        const accessToken  = generateAccessToken(newUser._id.toString());

        //hash the raw refresh token before storing in redis — we never store usable tokens
        const hashedRefreshToken = hashToken(refreshToken);

        //capture a lightweight device hint from the request for auditability
        //if user-agent is absent (e.g. API clients, tests) we store null gracefully
        const device = req.headers["user-agent"] || null;

        //store the session in redis with a 7-day TTL matching the refresh token lifespan
        await redisClient.set(
            sessionKey(sessionId),
            JSON.stringify({
                userId:      newUser._id.toString(),
                hashedToken: hashedRefreshToken,
                device,
                createdAt:   new Date().toISOString(),
            }),
            { EX: 7 * 24 * 60 * 60 } // 7 days in seconds
        );

        //add this sessionId to the user's session set so we can enumerate all active
        //devices for this user (e.g. "log out everywhere" or admin audit)
        //no TTL on the set itself — individual session keys expire on their own
        await redisClient.sAdd(sessionsSetKey(newUser._id.toString()), sessionId);

        // fix: the email was being awaited directly in the main try block, so if
        // sendOnboardingEmail threw after User.create() and redisClient.del() had
        // already succeeded, the catch block would return a 500 implying signup
        // failed — but the account already existed, leaving the user stuck.
        // now: email sending has its own try/catch so a mail failure never blocks
        // the success response. account creation succeeds independently of the email.
        try {
            await sendOnboardingEmail(email, {
                name:         username,
                dashboardUrl: process.env.FRONTEND_URL || "http://localhost:3000/dashboard",
            });
        } catch (emailError) {
            //log clearly so the team can investigate/retry, but do not surface this to the user
            console.error("Onboarding email failed to send (account was still created):", emailError);
        }

        //sending the refresh token as an httpOnly cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure:   process.env.NODE_ENV === "production", // true in production
            sameSite: "strict",
            // fix: cookie maxAge was 7 days but refresh JWT was "30d" — all three
            // (JWT expiry, Redis TTL, cookie maxAge) now agree on exactly 7 days.
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        });

        // return success along with the access token in JSON
        return res.status(201).json({
            success: true,
            message: "Your account has been created successfully!",
            accessToken,
            user: {
                username: newUser.username,
                email:    newUser.email,
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
};
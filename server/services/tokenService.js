import jwt from "jsonwebtoken";
import crypto from "crypto";

// ─── JWT Token Helpers ────────────────────────────────────────────────────────

export const generateAccessToken = (userId) =>
    jwt.sign(
        { userId },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
    );

export const generateRefreshToken = (userId, sessionId) =>
    jwt.sign(
        { userId, sessionId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "30d" }
    );

//hash a raw string (refresh token) with SHA-256 for safe storage
//we use SHA-256 here rather than bcrypt because the token is already a long random JWT
//and we only need a fast one-way hash for equality checks
export const hashToken = (rawToken) =>
    crypto.createHash("sha256").update(rawToken).digest("hex");

//function to generate the random unique string (used as a sign-up verification token)
export const generateToken = () => crypto.randomBytes(32).toString("hex");


/**
 * Verifies a refresh token's signature and expiry.
 * @param {string} token - raw refresh token from cookie
 * @returns {object} decoded payload { userId, sessionId } if valid
 * @throws if token is invalid, expired, or tampered
 */
export const verifyRefreshToken = (token) => {
    const decode = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    return decode;
};

import redisClient from "../../config/redisConfig.js";
import { sessionKey, sessionsSetKey, generateSessionId } from "../../services/sessionService.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "../../services/tokenService.js";
import User from "../../schema/userSchema.js";
import bcrypt from "bcryptjs";


//------------- End point POST /api/login --------------------------------------
export const login = async (req, res) => {
    //we will recieve email and the entered password from the request body
    const { email, password } = req.body;
    try {
        //if any field is not present we will give 400 missing credential
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Password or Email missing"
            })
        }

        //if they both are present than we will find the user 
        const user = await User.findOne({ email }).select("+hashed_password");

        //if user does not exist than send 401 invalid credential
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            })
        }

        //if user exists than comapre the rawPassword and the hasedPassord from the DB with
        //the help of the function called bycrypt.compare() , which automatically handles the salt and hashing
        const hashedPassword = user.hashed_password;

        const isPasswordMatched = await bcrypt.compare(password, hashedPassword);

        if (!isPasswordMatched) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            })
        }

        //if matched than
        // 1)we will generate new sessionId for this device
        // 2)generate new refresh token , hash it and store into the redis <sessionId>
        // 3)generate new access token
        // 4)send the refresh token in the cookies and send the access token in response with success code 200

        const newSession = generateSessionId();
        const refreshToken = generateRefreshToken(user._id, newSession);
        const hashedRefreshToken = hashToken(refreshToken);
        const device = req.headers["user-agent"] || null;
        await redisClient.set(
            sessionKey(newSession),
            JSON.stringify({
                userId: user._id.toString(),
                hashedToken: hashedRefreshToken,
                device,
                createdAt: new Date().toISOString(),
            }),
            { EX: 30 * 24 * 60 * 60 } // 30 days in seconds
        );
        await redisClient.sAdd(sessionsSetKey(user._id.toString()), newSession);
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // true in production
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
        });

        const accessToken = generateAccessToken(user._id);
        return res.status(200).json({
            success: true,
            message: "logged in successfully!",
            accessToken
        })

    } catch (error) {
        console.error("Error finalizing login:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error encountered while creating your account."
        });
    }
}
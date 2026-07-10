import { verifyRefreshToken, generateAccessToken, generateRefreshToken, hashToken } from "../services/tokenService.js";
import { sessionKey, sessionsSetKey, deadTokenKey } from "../services/sessionService.js";
import redisClient from "../config/redisConfig.js";

export const refreshToken = async (req, res) => {
    //we will get the token in the cookie 
    const token = req.cookies.refreshToken;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "refresh token is missing"
        })
    }

    //now if token found then we will verify it
    let decoded
    try {
        decoded = verifyRefreshToken(token);
    } catch (error) {
        console.error("JWT verification failed:", error);
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token is expired"
            })
        }
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token. Please authenticate again.",
        });
    }

    //now if the token is verified than it means we have to check the redis of that particular session 
    const sessionID = decoded.sessionId
    const redisKey = sessionKey(sessionID);
    const rawData = await redisClient.get(redisKey);

    //if the session(device) does not exists
    if (!rawData) {
        return res.status(401).json({
            success: false,
            message: "device does not exists"
        })
    }

    //session exists than next task is to check the token's existance into the 
    const { hashedRefreshToken, userId, createdAt } = JSON.parse(rawData);
    const receivedTokenHash = hashToken(token);

    //if the refresh token stored in the DB and the one in the cookies are matching
    try {
        if (hashedRefreshToken === receivedTokenHash) {
            //we will give new refresh and access token

            const newAccessToken = generateAccessToken(userId);
            const newRefreshToken = generateRefreshToken(userId, sessionID);

            //we will store old refrsh token into the redis to check the double use
            const deadTokenRedisKey = deadTokenKey(sessionID)
            await redisClient.set(
                deadTokenRedisKey,
                JSON.stringify({
                    hashedToken: hashedRefreshToken,
                    rotatedAt: new Date().toISOString(),
                }),
                { EX: 180 } //180 seconds TTL
            )
            //hash the new refresh token before storing so the raw JWT is never at rest in redis
            const hashedNewRefreshToken = hashToken(newRefreshToken);

            //overwrite the session entry in redis with the new hash and reset the TTL to 30 days
            await redisClient.set(
                redisKey,
                JSON.stringify({ hashedRefreshToken: hashedNewRefreshToken, userId, createdAt }),
                { EX: 30 * 24 * 60 * 60 } //30 days in seconds
            );

            //send the new refresh token as an HttpOnly cookie so JS on the client cannot read it
            res.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 30 * 24 * 60 * 60 * 1000 //30 days in milliseconds
            });

            //return the new access token in the response body so the client can store it in memory
            return res.status(200).json({
                success: true,
                message: "refresh token and access token rotated successfully",
                accessToken: newAccessToken
            })
        }

        //if they don't match than have to check in the deadtoken redis
        else {
            const deadData = await redisClient.get(deadTokenKey(sessionID));
            if (deadData) {
                const { hashedToken } = JSON.parse(deadData);
                //if we found that the received token is the same as the stored token in the dead_token we will revoke that perticular session
                if (receivedTokenHash == hashedToken) {
                    //we have user id so we will use it as a key to get the location
                    const multipleSessionKey = sessionsSetKey(userId);

                    //this condition will never true but still a safety layer
                    if (!multipleSessionKey) {
                        return res.status(401).json({
                            success: false,
                            message: "user does not exist"
                        })
                    }

                    //else remove the session (device) from the set
                    await redisClient.del(sessionKey(sessionID));
                    await redisClient.sRem(sessionsSetKey(userId), sessionID);

                    //clear the compromised cookie from the client so it cannot be used again
                    res.clearCookie("refreshToken", {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "strict"
                    });
                    return res.status(401).json({
                        success: false,
                        message: "Replay attack detected — session has been revoked"
                    });
                }
                else {

                    return res.status(401).json({
                        success: false,
                        message: "Token does not matched"
                    })
                }
            }
            else {
                //no dead_token entry found — token hash doesn't match and was never rotated, treat as plain invalid
                return res.status(401).json({
                    success: false,
                    message: "Invalid refresh token"
                });
            }
        }
    } catch (error) {
        console.log("error occured in the rotation", error.message)
        return res.status(500).json({
            success: false,
            message: "Error in the rotation"
        })
    }

}
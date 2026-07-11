import { verifyRefreshToken, generateAccessToken, generateRefreshToken, hashToken } from "../../services/tokenService.js";
import { sessionKey, sessionsSetKey, deadTokenKey } from "../../services/sessionService.js";
import redisClient from "../../config/redisConfig.js";

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
    // the field saved by login/setPassword is hashedToken, not hashedRefreshToken. Also read device to carry it forward.
    const { hashedToken, userId, device, createdAt } = JSON.parse(rawData);
    const receivedTokenHash = hashToken(token);

    //if the refresh token stored in the DB and the one in the cookies are matching
    try {
        // fix: compare against hashedToken, not hashedRefreshToken
        if (hashedToken === receivedTokenHash) {
            //we will give new refresh and access token

            const newAccessToken = generateAccessToken(userId);
            const newRefreshToken = generateRefreshToken(userId, sessionID);

            //we will store old refrsh token into the redis to check the double use
            const deadTokenRedisKey = deadTokenKey(sessionID)
            await redisClient.set(
                deadTokenRedisKey,
                JSON.stringify({
                    // fix: write dead_token payload with hashedOldToken per the spec instead of hashedToken
                    hashedOldToken: hashedToken,
                    rotatedAt: new Date().toISOString(),
                }),
                { EX: 180 } //180 seconds TTL
            )
            //hash the new refresh token before storing so the raw JWT is never at rest in redis
            const hashedNewRefreshToken = hashToken(newRefreshToken);

            //overwrite the session entry in redis with the new hash and reset the TTL to 30 days
            await redisClient.set(
                redisKey,
                // use correct hashedToken field name and preserve the original device field, with a fresh createdAt
                JSON.stringify({ userId, hashedToken: hashedNewRefreshToken, device, createdAt: new Date().toISOString() }),
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
                // read hashedOldToken to match the updated dead_token write payload
                const { hashedOldToken } = JSON.parse(deadData);
                //if we found that the received token is the same as the stored token in the dead_token we will revoke that perticular session
                //compare receivedTokenHash against hashedOldToken
                if (receivedTokenHash == hashedOldToken) {
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
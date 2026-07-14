import redisClient from "../../config/redisConfig.js";
import { sessionKey, sessionsSetKey, deadTokenKey } from "../../services/sessionService.js";
import jwt from "jsonwebtoken";

// POST /api/auth/logout
export const logoutFromOnedevice = async (req, res) => {
    // read from the refresh token cookie instead of req.user because this route has no authenticateJWT middleware
    const token = req.cookies?.refreshToken || req.cookies?.refresh_token;

    try {
        // if no refresh token is present, they are already logged out from this device's perspective
        if (!token) {

            return res.status(200).json({
                success: true,
                message: "logout successfully"
            });
        }

        // we use jwt.decode rather than jwt.verify because the refresh token might be expired,
        // and an expired token still needs to be able to successfully log out.
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, { ignoreExpiration: true })

        // if token payload is invalid, just clear the cookie and respond success
        if (!decoded || !decoded.userId || !decoded.sessionId) {


            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict"
            });
            return res.status(200).json({
                success: true,
                message: "logout successfully"
            });
        }

        const { userId, sessionId } = decoded;

        //both userId and sessionId exists
        //now we will remove the session from the session:<sessionId>
        const sessionIdKey = sessionKey(sessionId);
        const sessionSetKey = sessionsSetKey(userId);

        //session exists there , so delete the session
        await redisClient.del(sessionIdKey);

        //removing the session from the set of the session of a particular user
        await redisClient.sRem(sessionSetKey, sessionId);

        //clearing the cookies
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });
        return res.status(200).json({
            success: true,
            message: "logout successfully"
        })
    } catch (error) {
        console.log("error occured in the logout from the single device", error.message);
        return res.status(500).json({
            success: false,
            message: "logout failed"
        })
    }
}


// POST /api/auth/logout-all
export const logoutFromAllDevices = async (req, res) => {
    //this controller hits after the auth middleware so req.user has userId and sessionId
    const { userId } = req.user;

    try {
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "missing userId"
            });
        }

        const userSessionsKey = sessionsSetKey(userId);

        //fetch all sessionIds belonging to this user (SMEMBERS reads every member of the set)
        const sessionIds = await redisClient.sMembers(userSessionsKey);

        //delete every individual session:<sessionId> key
        //done in parallel with Promise.all since each delete is independent of the others
        if (sessionIds.length > 0) {
            await Promise.all(
                sessionIds.map((id) => redisClient.del(sessionKey(id)))
            );
        }

        //delete the sessions:<userId> set itself, now that all members are gone
        await redisClient.del(userSessionsKey);

        //clear the cookie for the device making this request too, since its session is now dead
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        return res.status(200).json({
            success: true,
            message: "logged out from all devices successfully"
        });
    } catch (error) {
        console.log("error occured in the logout from all devices", error.message);
        return res.status(500).json({
            success: false,
            message: "logout from all devices failed"
        });
    }
};
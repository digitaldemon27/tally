import redisClient from "../../config/redisConfig.js";
import { pendingUserKey } from "../../services/sessionService.js";

export const verifyTokenStatus = async (req, res) => {

    //take the sent token from the frontend after user clicks on the "vefify email" button
    //Destructured { token } from req.body instead of capturing the entire body object
    const { token } = req.body;

    //now we will check this agaist our redis key if the token exists or not

    try {

        //no token in the request sent by frontend
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is required.",
            });
        }

        const key = pendingUserKey(token);
        const token_exist = await redisClient.get(key);

        //if token does not exist in the redis
        if (!token_exist) {
            return res.status(400).json({
                success: false,
                message: "This verification link has expired or is invalid. Please request a new one.",
            });
        }

        //if above condition fails it means token exists in the redis , extend the time to live to 10 minutes to give them 
        //window to enter the password and once they click on the "set password" button in the frontend we will clean up the redis
        await redisClient.expire(key, 600);

        //Parse the stringified JSON back into a JavaScript object
        const parsedPayload = JSON.parse(token_exist);

        //Send the green light and the username back to React
        return res.status(200).json({
            success: true,
            username: parsedPayload.username,
            message: "Token is valid. Proceed to set password.",
        });

    } catch (error) {
        console.error("Error in verify token status request:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error encountered while verifying link.",
        });
    }
}
import User from "../schema/userSchema.js";
import redisClient from "../config/redisConfig.js";
import { sendVerificationEmail } from "../src/services/mail.service.js";
import { pendingUserKey, cooldownKey } from "../services/sessionService.js";
import { generateToken } from "../services/tokenService.js";


//----- Registering the new user -------------------
//----- Route : POST /api/auth/sign-up -------------

export const registerUser = async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const username = req.body.username?.trim();

    try {
        //if username or/and email already exists

        // const exsitingUser = await user.findOne({ email, username }); -> this is an and operation if both exist than only returns 1
        const exisitingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (exisitingUser) {
            return res.status(400).json({
                success: false,
                message: "Email or username already exists",
            });
        }
        //it means user does not exist , we will generate the payload and map it with a secure token 

        //if the user has requested earlier for sign up and still in the cooldown
        const isInCooldown = await redisClient.get(cooldownKey(email));
        if (isInCooldown) {
            return res.status(429).json({
                success: false,
                message: "Please wait 60 seconds before requesting another verification link.",
            });
        }

        //now if we in this line it means mail is not in cooldown so lets generate the token and store the payload into database
        const token = generateToken();
        const tempPayload = { email, username }

        await redisClient.set(pendingUserKey(token), JSON.stringify(tempPayload), { EX: 15 * 60 })
        await redisClient.set(cooldownKey(email), "true", { EX: 60 });

        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=${token}`;

        await sendVerificationEmail(email, {
            username,
            verificationUrl: verificationLink
        });

        return res.status(200).json({
            success: true,
            message: "Verification link sent to your email address.",
        });

    } catch (error) {
        console.error("Error in registration request:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error encountered during registration.",
        });
    }
}

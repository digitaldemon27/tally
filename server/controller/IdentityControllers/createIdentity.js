import Identity from "../../schema/identitySchema.js";
import User from "../../schema/userSchema.js";

//------------------------END point = POST /api/identity/create-identity -----------
// ------ called middleware authenticateJWT to allow onlyverifed user to create-----
export const createIdentityContoller = async (req, res) => {
    const { name } = req.body;
    const { userId } = req.user;

    try {
        //if both are / or missing
        if (!name || !userId) {
            return res.status(400).json({
                status: false,
                message: "fields missing"
            })
        }

        //saving the identity
        const newIdentity = await Identity.create({
            userId,
            name,
        })

        return res.status(201).json({
            status: true,
            message: "Identity created successfully"
        })

    } catch (error) {
        //if duplicate identity found database will send 11000 code in the error message
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "choose a different identity name"
            });
        }

        console.error("error creating identity:", error.message);
        return res.status(500).json({
            success: false,
            message: "failed to create identity"
        });
    }
}
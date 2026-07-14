import Identity from "../../schema/identitySchema.js";
import { validateObjectId } from "../../utils/validation.js";

// GET /api/identities/:id
// ----------- Middleware : authenticateJWT -----------------------

export const getIdentity = async (req, res) => {

    let { id } = req.params;
    const { userId } = req.user;

    // trim any trailing spaces or newline characters
    if (id) {
        id = id.trim();
    }

    // validate that the id parameter is a valid 24-character hexadecimal MongoDB ObjectId
    if (!validateObjectId(id, res, "identity")) {
        return;
    }

    try {
        //fetch the identity by id
        const identity = await Identity.findById(id);

        //if identity does not exists
        if (!identity) {
            return res.status(404).json({
                success: false,
                message: "identity does dot exists"
            })
        }

        //if exists than check the userId there in the identity is same as the userId of request
        if (identity.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "user is not matched"
            })
        }

        //if matched than return the identity
        return res.status(200).json({
            success: true,
            data: identity
        })
    } catch (error) {
        console.log("error occurred while fetching the identity", error.message);

        return res.status(500).json({
            success: false,
            message: "internal server error"
        })
    }
}
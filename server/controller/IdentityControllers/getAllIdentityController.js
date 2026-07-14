import Identity from "../../schema/identitySchema.js"; w


// GET /api/identities
//--------- Middleware : authenticateJWT ------------------------
export const getAllIdentities = async (req, res) => {
    const { userId } = req.user;

    try {
        //finding all the indentities belongs to a user
        const allIdentities = await Identity.find({ userId });

        return res.status(200).json({
            status: true,
            data: allIdentities,
        })
    } catch (error) {
        console.error("error fetching identities:", error.message);
        return res.status(500).json({
            status: false,
            message: "failed to fetch identities"
        });
    }
}
import Identity from "../../schema/identitySchema.js";

// PATCH /api/identities/:id
export const updateIdentity = async (req, res) => {
    // Extract parameters from request
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const { name } = req.body;

    try {
        // Validate name if provided
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: "name must be a non-empty string"
                });
            }

            // manually check for name duplication before updating,To enforce the user-specific unique index cleanly and prevent cryptic database-level duplicate key errors from crashing the request.
            const existingIdentity = await Identity.findOne({
                userId,
                name: name.trim(),
                _id: { $ne: id }
            });

            // Return conflict if name is already taken
            if (existingIdentity) {
                return res.status(409).json({
                    success: false,
                    message: "An identity with this name already exists"
                });
            }
        }

        // Run atomic update to modify identity fields
        const updatedIdentity = await Identity.findOneAndUpdate(
            { _id: id, userId },
            { name: name?.trim() },
            { new: true, runValidators: true }
        );

        // If identity is not found or user unauthorized
        if (!updatedIdentity) {
            return res.status(404).json({
                success: false,
                message: "identity not found"
            });
        }

        // Return successful response with updated identity object
        return res.status(200).json({
            success: true,
            message: "Identity updated successfully",
            identity: updatedIdentity
        });
    } catch (error) {
        // Log the internal error stack trace
        console.error("error occurred while updating identity:", error.message);

        // Return clean internal server error response
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

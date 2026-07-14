import Identity from "../../schema/identitySchema.js";

// PATCH /api/identities/:id
export const updateIdentity = async (req, res) => {
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

            // Manually check for name duplication before updating
            const existingIdentity = await Identity.findOne({
                userId,
                name: name.trim(),
                _id: { $ne: id }
            });

            if (existingIdentity) {
                return res.status(409).json({
                    success: false,
                    message: "An identity with this name already exists"
                });
            }
        }

        // 1. Fetch document by ID alone to bypass multi-connection casting bugs
        const identity = await Identity.findById(id);

        // 2. Perform isolation verification via runtime string conversion
        if (!identity || identity.userId.toString() !== userId.toString()) {
            return res.status(404).json({
                success: false,
                message: "identity not found"
            });
        }

        // 3. Mutate fields dynamically
        if (name !== undefined) {
            identity.name = name.trim();
        }

        // 4. Save the document to fire schema validation rules cleanly
        const updatedIdentity = await identity.save();

        return res.status(200).json({
            success: true,
            message: "Identity updated successfully",
            identity: updatedIdentity
        });

    } catch (error) {
        console.error("error occurred while updating identity:", error.message);
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};
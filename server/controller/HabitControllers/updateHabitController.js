import Habit from "../../schema/habitSchema.js";

// PATCH /api/habits/:id
export const updateHabit = async (req, res) => {
    // Extract parameters from request
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    // Extract allowed fields
    const { name, targetFrequency, tinyHabitVersion, stackingAnchor, environmentNote } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (targetFrequency !== undefined) updateFields.targetFrequency = targetFrequency;
    if (tinyHabitVersion !== undefined) updateFields.tinyHabitVersion = tinyHabitVersion;
    if (stackingAnchor !== undefined) updateFields.stackingAnchor = stackingAnchor;
    if (environmentNote !== undefined) updateFields.environmentNote = environmentNote;

    // Check if payload is completely empty
    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({
            success: false,
            message: "No valid fields provided for update"
        });
    }

    try {
        // If updating the name, check for uniqueness under the same identity
        if (updateFields.name) {
            const existingHabitToUpdate = await Habit.findOne({ _id: id, userId });
            if (!existingHabitToUpdate) {
                return res.status(404).json({
                    success: false,
                    message: "habit not found"
                });
            }

            const duplicateHabit = await Habit.findOne({
                identityId: existingHabitToUpdate.identityId,
                name: updateFields.name.trim(),
                _id: { $ne: id }
            });

            if (duplicateHabit) {
                return res.status(409).json({
                    success: false,
                    message: "A habit with this name already exists under the same identity"
                });
            }

            // apply trimming if a name was provided
            updateFields.name = updateFields.name.trim();
        }

        // Q: dynamically building an updateFields object and use $set ,To perform a strict partial update, ensuring we only overwrite the specific fields the user wants to change without nullifying the rest of the document.
        const updatedHabit = await Habit.findOneAndUpdate(
            { _id: id, userId },
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        // If habit is not found (though already checked if name was provided)
        if (!updatedHabit) {
            return res.status(404).json({
                success: false,
                message: "habit not found"
            });
        }

        // Return successful response with updated habit object
        return res.status(200).json({
            success: true,
            message: "Habit updated successfully",
            habit: updatedHabit
        });
    } catch (error) {
        // Log the internal error stack trace
        console.error("error occurred while updating habit:", error.message);

        // Return clean internal server error response
        return res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
};

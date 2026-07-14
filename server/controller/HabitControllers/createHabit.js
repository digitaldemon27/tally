import Habit from "../../schema/habitSchema.js";
import Identity from "../../schema/identitySchema.js";
import { validateObjectId } from "../../utils/validation.js";

// POST /api/habits
// ------ called middleware authenticateJWT to allow only verified user to create-----
export const createHabitController = async (req, res) => {
    //destructuring name and identityId from req.body, and userId from verified user token
    const { name, identityId } = req.body;
    const { userId } = req.user;

    try {
        //if any of the fields are missing in the request payload
        if (!name || !identityId || !userId) {
            return res.status(400).json({
                success: false,
                message: "name, identityId and userId are required"
            });
        }

        //validate that the identityId parameter is a valid 24-character hexadecimal MongoDB ObjectId
        if (!validateObjectId(identityId, res, "identity")) {
            return;
        }

        //verifying ownership — query Identity DB to verify that this identity belongs to the requesting user
        const identity = await Identity.findOne({ _id: identityId, userId });

        //if identity is not found or is owned by another user
        if (!identity) {
            return res.status(404).json({
                success: false,
                message: "Identity not found or unauthorized to create habit under it"
            });
        }

        //saving the habit — creating a new habit record linked to this identity and user
        const newHabit = await Habit.create({
            userId,
            identityId,
            name
        });

        //return the successful response with a 201 status code along with the habit document
        return res.status(201).json({
            success: true,
            message: "Habit created successfully",
            data: newHabit
        });

    } catch (error) {
        //if duplicate habit name is found under the same identity (compound unique index violation)
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A habit with this name already exists under this identity"
            });
        }

        //log the full error stack trace internally and return 500 status code
        console.error("error occurred while creating the habit:", error.message);
        return res.status(500).json({
            success: false,
            message: "failed to create habit"
        });
    }
};

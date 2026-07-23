import Habit from "../schema/habitSchema.js";

// core habit-list-for-identity logic extracted from the controller so the Buddy System can call it
// for a different user (the identity owner) without duplicating this code in two places
export const getHabitsForIdentity = async (identityId, userId) => {
    // only fetch non-archived habits — archived ones are hidden by default everywhere
    const habits = await Habit.find({ identityId, userId, isArchived: false });
    return habits;
};

import { DateTime } from "luxon";

// takes the timezone string sent by the client (like "Asia/Kolkata")
// and gives back midnight in that timezone, converted to a UTC Date
// so it can be stored and compared the same way everything else in the DB is stored
export const getUserMidnightUTC = (timezone) => {
    const dt = DateTime.now().setZone(timezone).startOf("day");
    if (!dt.isValid) return null; // bad/garbage timezone string
    return dt.toUTC().toJSDate();
};

// takes a date string like "2026-07-15" and a timezone string,
// and gives back midnight of THAT date in the user's timezone, as a UTC Date
export const getDateInUserTimezoneUTC = (dateString, timezone) => {
    const dt = DateTime.fromISO(dateString, { zone: timezone }).startOf("day");
    if (!dt.isValid) return null; // bad date string OR bad timezone
    return dt.toUTC().toJSDate();
};

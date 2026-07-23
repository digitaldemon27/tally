import { getUserMidnightUTC } from "../utils/getUserMidnightUTC.js";

// every endpoint that reads or writes a "date" field needs the user's
// timezone to know what day it actually is for them right now.
// this middleware pulls that timezone off the header, checks it's valid,
// and attaches today's correct date (in their timezone) onto the request
export const requireTimezone = (req, res, next) => {
    const timezone = req.headers["x-timezone"];

    if (!timezone) {
        return res.status(400).json({
            success: false,
            message: "X-Timezone header is required"
        });
    }

    const todayForUser = getUserMidnightUTC(timezone);

    if (!todayForUser) {
        return res.status(400).json({
            success: false,
            message: "Invalid timezone"
        });
    }

    req.timezone = timezone;          // raw string, needed later in getByDateController to parse specific dates
    req.todayForUser = todayForUser;  // ready-to-use normalized "today" for this user — controllers use this directly
    next();
};

//computing NMT here instead of a separate query ,To avoid an extra database round-trip by reusing the already-fetched last 7 days aggregation results.

export const computeMissedYesterday = (last7DaysLogs) => {
    // We normalize to UTC midnight to safely compare against DB dates which are stored normalized.
    const todayNormalized = new Date();
    todayNormalized.setUTCHours(0, 0, 0, 0);

    const yesterdayNormalized = new Date();
    yesterdayNormalized.setUTCHours(0, 0, 0, 0);
    yesterdayNormalized.setUTCDate(yesterdayNormalized.getUTCDate() - 1);

    //we cant compare to dates objects as the comparing that way will lead to comapring the address / refrence so
    //have to convert them into some numbers , getTime does the exact thing.
    const todayTime = todayNormalized.getTime();
    const yesterdayTime = yesterdayNormalized.getTime();

    // The rule: missedYesterday = true ONLY IF no vote yesterday AND no vote today.
    let votedToday = false;
    let votedYesterday = false;

    //if last7DaysLogs is null than the loop will crash so if its null than consider it is EMPTY.
    for (const log of (last7DaysLogs || [])) {
        if (!log.date) continue;
        const logTime = new Date(log.date).getTime();

        if (logTime === todayTime) votedToday = true;
        if (logTime === yesterdayTime) votedYesterday = true;
    }

    // If they voted either today or yesterday, they haven't missed twice currently.
    if (votedToday || votedYesterday) {
        return false;
    }

    // Neither today nor yesterday had a vote.
    return true;
};

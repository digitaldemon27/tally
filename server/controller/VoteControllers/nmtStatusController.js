//computing NMT here instead of a separate query ,To avoid an extra database round-trip by reusing the already-fetched last 7 days aggregation results.

// accepts todayForUser (already computed by requireTimezone middleware or caller)
// so we don't recompute "today" internally — whoever calls this decides what "today" is
export const computeMissedYesterday = (last7DaysLogs, todayForUser) => {
    const todayTime = todayForUser.getTime();

    // yesterday = today - 1 day (same timezone-aware base, just subtract 24h in ms)
    const yesterdayTime = todayTime - 24 * 60 * 60 * 1000;

    //we cant compare to dates objects as the comparing that way will lead to comparing the address / reference so
    //have to convert them into some numbers , getTime does the exact thing.
    let votedToday = false;
    let votedYesterday = false;

    //if last7DaysLogs is null than the loop will crash so if its null than consider it is EMPTY.
    for (const log of (last7DaysLogs || [])) {
        if (!log.date) continue;
        const logTime = new Date(log.date).getTime();

        if (logTime === todayTime) votedToday = true;
        if (logTime === yesterdayTime) votedYesterday = true;
    }

    // The rule: missedYesterday = true ONLY IF no vote yesterday AND no vote today.
    // We intentionally do not look further back than yesterday.
    if (votedToday || votedYesterday) {
        return false;
    }

    // Neither today nor yesterday had a vote.
    return true;
};

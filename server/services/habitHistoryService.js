import HabitLog from "../schema/habitLogSchema.js";
import Habit from "../schema/habitSchema.js";
import mongoose from "mongoose";
import { DateTime } from "luxon";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const CALENDAR_DAYS = 28; // 1 month (4 weeks)

const DAY_LABELS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toUTCMidnight(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(base, n) {
  return new Date(base.getTime() + n * MS_PER_DAY);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function computeTrend(current, previous, daysSinceCreation) {
  if (daysSinceCreation < 7)   return { label: "Starting",   description: "Every vote is a statement about who you are." };
  if (current >= 90)            return { label: "Excellent",  description: "Outstanding consistency — this identity is taking hold." };
  if (daysSinceCreation < 30) {
    if (current >= 70)          return { label: "Strong",     description: "Great early momentum. Keep it going." };
    return                             { label: "Building",   description: "Every vote counts. You are defining yourself." };
  }
  const delta = current - previous;
  if (delta >= 15)  return { label: "Improving",  description: `Up ${delta}% from last month.` };
  if (delta <= -15) return { label: "Declining",  description: `Down ${Math.abs(delta)}% from last month — every new vote counts.` };
  if (current >= 70 && previous < 50) return { label: "Recovering", description: "Bouncing back — this is what resilience looks like." };
  if (current >= 60) return { label: "Stable",    description: "Consistently showing up. Stability is strength." };
  return             { label: "Rebuilding", description: "Every fresh vote is a fresh start." };
}

function computeActiveWindows(calendar, todayStr) {
  const completedSet = new Set(
    calendar.filter(c => c.status === "completed").map(c => c.date)
  );

  // Current window: walk backwards from today
  let currentWindow = 0;
  let cursor = todayStr;
  while (completedSet.has(cursor)) {
    currentWindow++;
    const d = new Date(cursor + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = formatDate(d);
  }

  // Longest window across the calendar
  const sorted = [...completedSet].sort();
  if (sorted.length === 0) return { longest: 0, current: currentWindow };

  let maxRun = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round(
      (new Date(sorted[i] + "T00:00:00Z") - new Date(sorted[i - 1] + "T00:00:00Z")) / MS_PER_DAY
    );
    if (diff === 1) { run++; } else { maxRun = Math.max(maxRun, run); run = 1; }
  }
  maxRun = Math.max(maxRun, run);

  return { longest: maxRun, current: currentWindow };
}

/**
 * buildHabitHistory — single-query service.
 * One $facet aggregation: all-time count + last-84-days logs.
 * Everything else is computed in memory.
 * Returns UI-ready DTO or null (not found / not owned).
 */
export const buildHabitHistory = async (habitId, userId, timezone = null) => {
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) return null;

  const habitObjectId = new mongoose.Types.ObjectId(habitId);
  const userObjectId  = new mongoose.Types.ObjectId(userId);

  // Compute "today" in the user's timezone if provided, else fall back to server UTC.
  // The vote storage uses getUserMidnightUTC(timezone) so the stored UTC date corresponds
  // to midnight in the user's local timezone. We must match that offset when computing
  // which calendar date is "today".
  let today;
  if (timezone) {
    const dt = DateTime.now().setZone(timezone);
    if (dt.isValid) {
      // User's today as a UTC Date at the right timezone-midnight offset
      today = dt.startOf('day').toUTC().toJSDate();
    } else {
      today = toUTCMidnight(new Date());
    }
  } else {
    today = toUTCMidnight(new Date());
  }
  const calendarStart = addDays(today, -(CALENDAR_DAYS - 1));
  const sixtyDaysAgo  = addDays(today, -59);
  const thirtyDaysAgo = addDays(today, -29);

  // ── Single aggregation ──────────────────────────────────────────────────────
  const [agg] = await HabitLog.aggregate([
    { $match: { habitId: habitObjectId, userId: userObjectId } },
    {
      $facet: {
        totalCount: [{ $count: "n" }],
        recentLogs: [
          { $match: { date: { $gte: calendarStart } } },
          { $project: { date: 1, note: 1, _id: 0 } },
          { $sort: { date: 1 } }
        ]
      }
    }
  ]);

  const totalVotes = agg?.totalCount?.[0]?.n ?? 0;
  const recentLogs = agg?.recentLogs ?? [];

  // O(1) lookup structures
  const completedSet = new Set();
  const noteMap      = {};
  for (const log of recentLogs) {
    const ds = formatDate(new Date(log.date));
    completedSet.add(ds);
    if (log.note) noteMap[ds] = log.note;
  }

  // Normalize createdAt using the same timezone offset as today.
  // toUTCMidnight gives UTC midnight of the creation date, but if we're using
  // timezone-aware today (e.g. IST midnight), we must also normalize createdAt
  // to midnight IN THAT TIMEZONE. Otherwise a habit created today shows as pre-creation.
  let createdAt;
  if (timezone) {
    const dtCreated = DateTime.fromJSDate(habit.createdAt).setZone(timezone);
    createdAt = dtCreated.isValid
      ? dtCreated.startOf('day').toUTC().toJSDate()
      : toUTCMidnight(habit.createdAt);
  } else {
    createdAt = toUTCMidnight(habit.createdAt);
  }
  const todayStr          = formatDate(today);
  const daysSinceCreation = Math.max(0, Math.floor((today.getTime() - createdAt.getTime()) / MS_PER_DAY));

  // ── Calendar ────────────────────────────────────────────────────────────────
  const calendar = [];
  for (let i = 0; i < CALENDAR_DAYS; i++) {
    const cellDate = addDays(calendarStart, i);
    const ds       = formatDate(cellDate);
    const isToday  = ds === todayStr;
    const isFuture = cellDate.getTime() > today.getTime();
    const isBeforeCreation = cellDate.getTime() < createdAt.getTime();

    let status;
    if      (isFuture)         status = "future";
    else if (completedSet.has(ds)) status = "completed";
    else if (isBeforeCreation) status = "pre-creation";
    else if (isToday)          status = "today";
    else                       status = "missed";

    calendar.push({
      date:      ds,
      month:     MONTH_LABELS[cellDate.getUTCMonth()],
      day:       cellDate.getUTCDate(),
      dayOfWeek: cellDate.getUTCDay(),
      weekIndex: Math.floor(i / 7),
      status, isToday, isFuture,
      note: noteMap[ds] ?? null
    });
  }

  // ── Consistency ─────────────────────────────────────────────────────────────
  const currentActiveDays  = Math.min(30, daysSinceCreation + 1);
  const monthlyVotes       = recentLogs.filter(l => new Date(l.date) >= thirtyDaysAgo).length;
  const currentConsistency = currentActiveDays > 0
    ? Math.round((monthlyVotes / currentActiveDays) * 100) : 0;

  const previousActiveDays  = Math.min(30, Math.max(0, daysSinceCreation - 29));
  const previousVotes       = recentLogs.filter(l => {
    const d = new Date(l.date);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  }).length;
  const previousConsistency = previousActiveDays > 0
    ? Math.round((previousVotes / previousActiveDays) * 100) : 0;

  const trend = computeTrend(currentConsistency, previousConsistency, daysSinceCreation);

  // ── NMT ─────────────────────────────────────────────────────────────────────
  const completedToday      = completedSet.has(todayStr);
  const yesterdayStr        = formatDate(addDays(today, -1));
  const completedYesterday  = completedSet.has(yesterdayStr);
  const missedYesterday     = daysSinceCreation > 0 && !completedYesterday && !completedToday;
  const nearNeverMissTwice  = missedYesterday;

  // ── Weekday stats ───────────────────────────────────────────────────────────
  const weekdayStats = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i, day: DAY_LABELS[i], completedCount: 0, totalCount: 0, rate: 0
  }));

  for (const cell of calendar) {
    if (cell.isFuture || cell.status === "pre-creation") continue;
    weekdayStats[cell.dayOfWeek].totalCount++;
    if (cell.status === "completed") weekdayStats[cell.dayOfWeek].completedCount++;
  }
  weekdayStats.forEach(ws => {
    ws.rate = ws.totalCount > 0 ? Math.round((ws.completedCount / ws.totalCount) * 100) : 0;
  });

  const activeDayStats = weekdayStats.filter(ws => ws.totalCount >= 2);
  const weakestDay   = activeDayStats.length > 0
    ? activeDayStats.reduce((a, b) => a.rate <= b.rate ? a : b).day : null;
  const strongestDay = activeDayStats.length > 0
    ? activeDayStats.reduce((a, b) => a.rate >= b.rate ? a : b).day : null;

  // ── Active windows ──────────────────────────────────────────────────────────
  const { longest: longestActiveWindow, current: currentActiveWindow } =
    computeActiveWindows(calendar, todayStr);

  return {
    habitId:    habit._id.toString(),
    habitName:  habit.name,
    isArchived: habit.isArchived,
    createdAt:  habit.createdAt.toISOString(),

    completedToday,
    totalVotes,
    monthlyVotes,
    currentConsistency,
    previousConsistency,
    trend:            trend.label,
    trendDescription: trend.description,

    missedYesterday,
    nearNeverMissTwice,

    calendar,
    firstCellDayOfWeek: calendar[0]?.dayOfWeek ?? 0,

    weekdayStats,
    weakestDay,
    strongestDay,

    longestActiveWindow,
    currentActiveWindow
  };
};

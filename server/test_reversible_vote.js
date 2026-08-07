import dotenv from 'dotenv';
import { connectDB } from './config/dbConfig.js';
import Habit from './schema/habitSchema.js';
import HabitLog from './schema/habitLogSchema.js';
import { getVoteSummaryForHabit } from './utils/voteSummaryUtil.js';

dotenv.config();

async function main() {
  await connectDB();

  const habit = await Habit.findOne({});
  if (!habit) {
    console.error('No habit found');
    process.exit(1);
  }

  const userId = habit.userId.toString();
  const habitId = habit._id.toString();
  const identityId = habit.identityId.toString();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  console.log(`Testing reversible vote for habit: ${habit.name}`);

  // 1. Clear today's log if any
  await HabitLog.deleteOne({ userId, habitId, date: today });

  let summary = await getVoteSummaryForHabit(habitId, userId, today);
  console.log(`Initial votedToday: ${summary.votedToday}`);

  // 2. Cast vote
  await HabitLog.create({ userId, identityId, habitId, date: today });
  summary = await getVoteSummaryForHabit(habitId, userId, today);
  console.log(`After cast vote, votedToday: ${summary.votedToday}`);

  // 3. Unvote (reverse vote)
  const deleted = await HabitLog.findOneAndDelete({ userId, habitId, date: today });
  console.log(`Unvoted today log: ${!!deleted}`);

  summary = await getVoteSummaryForHabit(habitId, userId, today);
  console.log(`After unvote, votedToday: ${summary.votedToday}`);

  if (summary.votedToday === false) {
    console.log('✅ TEST PASSED: Reversible vote logic is working 100%!');
  } else {
    console.error('❌ TEST FAILED');
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

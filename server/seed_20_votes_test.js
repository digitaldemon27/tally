import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/dbConfig.js';
import Habit from './schema/habitSchema.js';
import HabitLog from './schema/habitLogSchema.js';
import { buildHabitHistory } from './services/habitHistoryService.js';

dotenv.config();

async function main() {
  await connectDB();

  const habit = await Habit.findOne({ name: 'test 1' }) || await Habit.findOne({});
  if (!habit) {
    console.error('No habit found to test');
    process.exit(1);
  }

  console.log(`Using habit: ${habit.name} (${habit._id})`);

  // Backdate createdAt to 60 days ago
  const createdDate = new Date();
  createdDate.setDate(createdDate.getDate() - 60);
  habit.createdAt = createdDate;
  await habit.save();

  // Clear existing logs
  await HabitLog.deleteMany({ habitId: habit._id });

  // Compute today's date normalized to midnight UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Helper to subtract N days
  const subDays = (n) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - n);
    return d;
  };

  // Group of 7, 3, 4, 4, 2 days = 20 votes
  // Group 1: 7 days (days 29, 28, 27, 26, 25, 24, 23 ago)
  // Group 2: 3 days (days 20, 19, 18 ago)
  // Group 3: 4 days (days 15, 14, 13, 12 ago)
  // Group 4: 4 days (days 8, 7, 6, 5 ago)
  // Group 5: 2 days (days 1, 0 ago)
  const offsets = [
    29, 28, 27, 26, 25, 24, 23, // 7 days
    20, 19, 18,                 // 3 days
    15, 14, 13, 12,             // 4 days
    8, 7, 6, 5,                 // 4 days
    1, 0                        // 2 days
  ];

  const logs = offsets.map(off => ({
    userId: habit.userId,
    identityId: habit.identityId,
    habitId: habit._id,
    date: subDays(off),
    note: `Vote for day ${off} ago`
  }));

  await HabitLog.insertMany(logs);
  console.log(`Successfully inserted ${logs.length} votes across 30 days.`);

  // Test the DTO builder service
  const dto = await buildHabitHistory(habit._id.toString(), habit.userId.toString(), 'Asia/Kolkata');

  const completedCells = dto.calendar.filter(c => c.status === 'completed');
  console.log('--- DTO Verification ---');
  console.log(`Habit Name: ${dto.habitName}`);
  console.log(`Total Votes: ${dto.totalVotes}`);
  console.log(`Monthly Votes: ${dto.monthlyVotes}`);
  console.log(`Completed Cells in 12-Week Graph: ${completedCells.length}`);
  console.log(`Completed Today: ${dto.completedToday}`);
  console.log(`Current Consistency: ${dto.currentConsistency}%`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

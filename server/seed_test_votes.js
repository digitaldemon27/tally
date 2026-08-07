import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { clusterConnection, connectDB } from './config/dbConfig.js';
import Habit from './schema/habitSchema.js';
import HabitLog from './schema/habitLogSchema.js';

dotenv.config();

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const habit = await Habit.findOne({ name: 'test 1' });
    if (!habit) { console.log('No habit named "test 1" found'); return process.exit(1); }

    const habitId = habit._id;
    const userId = habit.userId;
    const identityId = habit.identityId;

    // 1. Backdate the habit creation to 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    await Habit.updateOne({ _id: habitId }, { $set: { createdAt: ninetyDaysAgo } });
    console.log('Backdated habit:', habit.name, 'to', ninetyDaysAgo);

    // 2. Clear existing logs for this habit
    await HabitLog.deleteMany({ habitId: habitId });

    // 3. Generate non-uniform votes for the past 70 days
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const votes = [];
    
    // logic: 
    // day -70 to -57 (14 days): VOTE
    // day -56 to -52 (5 days): MISS
    // day -51 to -22 (30 days): VOTE
    // day -21 to -20 (2 days): MISS
    // day -19 to 0 (20 days): VOTE

    let voteCount = 0;
    for (let i = 70; i >= 0; i--) {
      let isVote = false;
      if (i >= 57 && i <= 70) isVote = true; // 14 days
      else if (i >= 22 && i <= 51) isVote = true; // 30 days
      else if (i >= 0 && i <= 19) isVote = true; // 20 days

      if (isVote) {
        const voteDate = new Date(today);
        voteDate.setDate(voteDate.getDate() - i);
        // Stored votes should be in UTC, but the user is in IST (UTC+5:30), so midnight IST is UTC 18:30 the previous day.
        const istMidnightAsUTC = new Date(voteDate);
        istMidnightAsUTC.setUTCHours(-5, -30, 0, 0); // subtract 5 hours 30 mins
        
        votes.push({
          habitId,
          userId,
          identityId,
          date: istMidnightAsUTC,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        voteCount++;
      }
    }

    await HabitLog.insertMany(votes);
    console.log('Inserted', voteCount, 'votes out of 71 days.');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();

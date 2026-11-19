import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { summarizeHomeLearningActivity } from './src/user/home/home.user.js';

const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
dotenv.config({ path: rootEnv, quiet: true });

const EMAIL = 'thinkup.edu.vn@gmail.com';
const SEED_SOURCE = 'home-learning-rhythm-demo-v1';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAILY_GOAL_SECONDS = 15 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function localDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}

function stableUuid(value) {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function main() {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
    throw new Error('MONGODB_URI and MONGODB_DB_NAME must be configured in the repository .env file.');
  }

  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const users = await db.collection('users').find({ email: EMAIL }).project({ _id: 1 }).limit(2).toArray();
    if (users.length !== 1) throw new Error(`Expected exactly one user for ${EMAIL}; found ${users.length}.`);

    const now = new Date();
    const today = localDateParts(now);
    const todayUtcMidnight = Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day));
    const sessions = [];

    for (let daysAgo = 0; daysAgo < 84; daysAgo++) {
      // Keep the current seven days qualifying; earlier weeks vary to make the
      // twelve-week rhythm view useful while keeping every interval in the past.
      const scheduled = daysAgo < 7 || [0, 1, 3, 4, 6].includes(daysAgo % 7);
      if (!scheduled) continue;

      const date = new Date(todayUtcMidnight - daysAgo * DAY_MS);
      const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      const startedAt = new Date(`${dateKey}T01:00:00.000Z`); // 08:00 in Ho Chi Minh City.
      const durationSeconds = DAILY_GOAL_SECONDS + 5 * 60 + ((daysAgo * 17) % (45 * 60));
      const endedAt = new Date(+startedAt + durationSeconds * 1000);
      if (+endedAt > +now) continue;

      sessions.push({
        _id: stableUuid(`${SEED_SOURCE}:${users[0]._id}:${dateKey}`),
        user_id: String(users[0]._id),
        kind: 'demo_seed',
        target: { seed: SEED_SOURCE },
        state: 'finished',
        sequence: 1,
        credited_milliseconds: durationSeconds * 1000,
        intervals: [{ started_at: startedAt, ended_at: endedAt }],
        created_at: startedAt,
        last_seen_at: endedAt,
        expires_at: new Date(+endedAt + 2 * 60 * 60 * 1000),
        last_event: null,
        seed_source: SEED_SOURCE,
      });
    }

    const collection = db.collection('learning_activity_sessions');
    await collection.deleteMany({ user_id: String(users[0]._id), seed_source: SEED_SOURCE });
    if (sessions.length) await collection.insertMany(sessions, { ordered: true });

    const stored = await collection.find({ user_id: String(users[0]._id) }, { projection: { intervals: 1, created_at: 1, seed_source: 1 } }).toArray();
    const intervals = stored.flatMap(session => session.intervals || []);
    const first = stored.reduce((earliest, session) => !earliest || session.created_at < earliest ? session.created_at : earliest, null);
    const summary = summarizeHomeLearningActivity(intervals, { now, timezone: TIME_ZONE, recordedSince: first });
    console.log(JSON.stringify({
      accountMatched: true,
      seededDays: sessions.length,
      currentStreak: summary.streak.current_streak,
      dailyGoalMinutes: summary.daily_goal_seconds / 60,
      activeDaysThisYear: summary.active_days,
      totalActiveMinutesThisYear: Math.floor(summary.total_active_seconds / 60),
      demoSeedSessions: await collection.countDocuments({ user_id: String(users[0]._id), seed_source: SEED_SOURCE }),
    }));
  } finally {
    await client.close();
  }
}

main().catch(error => {
  console.error(`Learning rhythm seed failed: ${error.message}`);
  process.exitCode = 1;
});

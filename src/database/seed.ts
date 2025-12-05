import fs from 'fs';
import path from 'path';
import { Database } from './Database';
import { UserProfile } from '../models/UserProfile';
import { Biomarker, BIOMARKER_DEFINITIONS } from '../models/Biomarker';
import { Habit, HABIT_TEMPLATES } from '../models/Habit';
import { Points, Reward, DEFAULT_REWARDS } from '../models/Points';
import { Sex, ActivityLevel, DietType } from '../models/types';

async function seed() {
  console.log('Starting database seeding...');

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database and schema
  const db = Database.getInstance();
  db.initializeSchema();

  // Seed rewards
  console.log('Seeding rewards...');
  await Reward.initializeDefaultRewards();

  // Create demo user
  console.log('Creating demo user...');
  const demoUser = new UserProfile({
    username: 'demo_user',
    email: 'demo@lifespanplus.com',
    age: 35,
    sex: Sex.MALE,
    height_cm: 178,
    weight_kg: 75,
    body_fat_percentage: 18,
    lifestyle_factors: {
      sleep_avg_hours: 7.5,
      activity_level: ActivityLevel.MODERATELY_ACTIVE,
      diet_type: DietType.MEDITERRANEAN,
      stress_score: 4,
      smoking_status: false,
      alcohol_drinks_per_week: 3
    },
    medical_history: {
      conditions: [],
      medications: [],
      allergies: [],
      family_history: ['Heart disease (grandfather)'],
      surgeries: []
    }
  });
  await demoUser.save();
  console.log(`Demo user created: ${demoUser.user_id}`);

  // Initialize points for demo user
  const points = new Points({ user_id: demoUser.user_id });
  await points.save();

  // Create demo biomarkers
  console.log('Creating demo biomarkers...');
  const biomarkerData: { key: string; value: number }[] = [
    { key: 'ldl_cholesterol', value: 95 },
    { key: 'hdl_cholesterol', value: 65 },
    { key: 'apob', value: 75 },
    { key: 'fasting_glucose', value: 88 },
    { key: 'hba1c', value: 5.2 },
    { key: 'fasting_insulin', value: 6 },
    { key: 'triglycerides', value: 85 },
    { key: 'vo2_max', value: 45 },
    { key: 'hrv', value: 55 },
    { key: 'resting_heart_rate', value: 58 },
    { key: 'hs_crp', value: 0.8 },
    { key: 'homocysteine', value: 8 },
    { key: 'vitamin_d', value: 55 },
    { key: 'thyroid_tsh', value: 1.8 },
    { key: 'blood_pressure_systolic', value: 118 }
  ];

  for (const { key, value } of biomarkerData) {
    const biomarker = Biomarker.createFromDefinition(demoUser.user_id, key, value);
    await biomarker.save();
  }

  // Add some historical biomarker data for trends
  const historicalDates = [30, 60, 90].map(daysAgo => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  });

  for (const date of historicalDates) {
    // VO2 Max improving over time
    const vo2Def = BIOMARKER_DEFINITIONS['vo2_max'];
    const vo2Biomarker = new Biomarker({
      user_id: demoUser.user_id,
      name: vo2Def.name,
      value: 42 + Math.random() * 3,
      unit: vo2Def.unit,
      timestamp: date,
      clinical_range_min: vo2Def.clinical_range_min,
      clinical_range_max: vo2Def.clinical_range_max,
      optimal_range_min: vo2Def.optimal_range_min,
      optimal_range_max: vo2Def.optimal_range_max,
      risk_weight: vo2Def.risk_weight,
      category: vo2Def.category
    });
    await vo2Biomarker.save();
  }

  // Create demo habits
  console.log('Creating demo habits...');
  const habitTemplates = ['sleep_8_hours', 'exercise_30_min', 'meditation_15_min', 'no_alcohol', 'zone_2_cardio'];

  for (const templateKey of habitTemplates) {
    const habit = Habit.createFromTemplate(demoUser.user_id, templateKey);
    // Add some initial streak
    habit.current_streak = Math.floor(Math.random() * 10);
    habit.longest_streak = habit.current_streak + Math.floor(Math.random() * 5);
    habit.success_rate = 70 + Math.floor(Math.random() * 25);
    await habit.save();
  }

  // Seed achievements
  console.log('Seeding achievements...');
  const achievements = [
    {
      achievement_id: 'first_biomarker',
      name: 'First Steps',
      description: 'Log your first biomarker',
      icon: '🧬',
      criteria: 'log_biomarker_1',
      points_reward: 50
    },
    {
      achievement_id: 'week_streak',
      name: 'Week Warrior',
      description: 'Maintain a 7-day habit streak',
      icon: '🔥',
      criteria: 'habit_streak_7',
      points_reward: 100
    },
    {
      achievement_id: 'month_streak',
      name: 'Monthly Master',
      description: 'Maintain a 30-day habit streak',
      icon: '🏆',
      criteria: 'habit_streak_30',
      points_reward: 500
    },
    {
      achievement_id: 'biomarker_10',
      name: 'Data Driven',
      description: 'Log 10 different biomarkers',
      icon: '📊',
      criteria: 'log_biomarker_10',
      points_reward: 200
    },
    {
      achievement_id: 'bio_age_reduction',
      name: 'Age Reverser',
      description: 'Reduce biological age by 1 year',
      icon: '⏪',
      criteria: 'bio_age_reduction_1',
      points_reward: 1000
    },
    {
      achievement_id: 'optimal_zone',
      name: 'Optimal Zone',
      description: 'Get all major biomarkers in optimal range',
      icon: '🎯',
      criteria: 'all_biomarkers_optimal',
      points_reward: 2000
    },
    {
      achievement_id: 'early_adopter',
      name: 'Early Adopter',
      description: 'Join Lifespan+ in its first year',
      icon: '🌟',
      criteria: 'join_early',
      points_reward: 100
    },
    {
      achievement_id: 'level_up_intermediate',
      name: 'Rising Star',
      description: 'Reach Intermediate level',
      icon: '⬆️',
      criteria: 'reach_level_intermediate',
      points_reward: 250
    }
  ];

  for (const achievement of achievements) {
    db.run(`
      INSERT OR REPLACE INTO achievements (
        achievement_id, name, description, icon, criteria, points_reward
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      achievement.achievement_id,
      achievement.name,
      achievement.description,
      achievement.icon,
      achievement.criteria,
      achievement.points_reward
    ]);
  }

  console.log('Database seeding completed successfully!');
  console.log(`\nDemo user credentials:`);
  console.log(`  User ID: ${demoUser.user_id}`);
  console.log(`  Email: ${demoUser.email}`);
}

seed().catch(console.error);

import { UserProfile } from '../models/UserProfile';
import { Biomarker } from '../models/Biomarker';
import { Habit } from '../models/Habit';
import { Points, PointsTransaction } from '../models/Points';
import { LifespanPrediction } from '../models/LifespanPrediction';
import { UserLevel, ActivityLevel, DietType, Sex } from '../models/types';
import { Database } from '../database/Database';

/**
 * Interfaces for profile views
 */
export interface ProfileSummary {
  user_id: string;
  username: string;
  email: string;
  age: number;
  sex: Sex;
  member_since: Date;
  physical_stats: {
    height_cm: number;
    weight_kg: number;
    bmi: number;
    bmi_category: string;
    body_fat_percentage: number | undefined;
  };
  lifestyle: {
    activity_level: ActivityLevel;
    activity_level_display: string;
    diet_type: DietType;
    diet_type_display: string;
    sleep_hours: number;
    stress_score: number;
    smoking: boolean;
    alcohol_per_week: number;
  };
  longevity_stats: {
    biological_age: number | null;
    chronological_age: number;
    age_difference: number | null;
    predicted_lifespan: number | null;
  };
  gamification: {
    level: UserLevel;
    level_display: string;
    current_points: number;
    lifetime_points: number;
    achievements_earned: number;
    total_achievements: number;
  };
}

export interface ProfileEditableFields {
  username: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  body_fat_percentage: number | undefined;
  ethnicity: string | undefined;
  sleep_avg_hours: number;
  activity_level: ActivityLevel;
  diet_type: DietType;
  stress_score: number;
  smoking_status: boolean;
  alcohol_drinks_per_week: number;
}

export interface ProfileActivity {
  type: 'biomarker' | 'habit' | 'achievement' | 'points' | 'prediction';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
}

/**
 * Profile View - Formats user profile data for UI
 */
export class ProfileView {
  /**
   * Get complete profile summary
   */
  static async getProfileSummary(userId: string): Promise<ProfileSummary | null> {
    const user = UserProfile.findById(userId);
    if (!user) return null;

    const points = await Points.getOrCreate(userId);
    const prediction = LifespanPrediction.findLatestByUserId(userId);

    // Get achievement counts
    const db = Database.getInstance();
    const achievementCounts = db.get<{ earned: number; total: number }>(`
      SELECT
        (SELECT COUNT(*) FROM user_achievements WHERE user_id = ?) as earned,
        (SELECT COUNT(*) FROM achievements) as total
    `, [userId]);

    return {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      age: user.age,
      sex: user.sex,
      member_since: user.created_at,
      physical_stats: {
        height_cm: user.height_cm,
        weight_kg: user.weight_kg,
        bmi: user.bmi,
        bmi_category: user.bmiCategory,
        body_fat_percentage: user.body_fat_percentage
      },
      lifestyle: {
        activity_level: user.lifestyle_factors.activity_level,
        activity_level_display: this.formatActivityLevel(user.lifestyle_factors.activity_level),
        diet_type: user.lifestyle_factors.diet_type,
        diet_type_display: this.formatDietType(user.lifestyle_factors.diet_type),
        sleep_hours: user.lifestyle_factors.sleep_avg_hours,
        stress_score: user.lifestyle_factors.stress_score,
        smoking: user.lifestyle_factors.smoking_status,
        alcohol_per_week: user.lifestyle_factors.alcohol_drinks_per_week
      },
      longevity_stats: {
        biological_age: prediction?.biological_age || null,
        chronological_age: user.age,
        age_difference: prediction?.age_difference || null,
        predicted_lifespan: prediction?.predicted_lifespan_years || null
      },
      gamification: {
        level: points.level,
        level_display: this.formatLevel(points.level),
        current_points: points.current_points,
        lifetime_points: points.lifetime_points,
        achievements_earned: achievementCounts?.earned || 0,
        total_achievements: achievementCounts?.total || 0
      }
    };
  }

  /**
   * Get editable profile fields
   */
  static getEditableFields(userId: string): ProfileEditableFields | null {
    const user = UserProfile.findById(userId);
    if (!user) return null;

    return {
      username: user.username,
      age: user.age,
      height_cm: user.height_cm,
      weight_kg: user.weight_kg,
      body_fat_percentage: user.body_fat_percentage,
      ethnicity: user.ethnicity,
      sleep_avg_hours: user.lifestyle_factors.sleep_avg_hours,
      activity_level: user.lifestyle_factors.activity_level,
      diet_type: user.lifestyle_factors.diet_type,
      stress_score: user.lifestyle_factors.stress_score,
      smoking_status: user.lifestyle_factors.smoking_status,
      alcohol_drinks_per_week: user.lifestyle_factors.alcohol_drinks_per_week
    };
  }

  /**
   * Get recent activity timeline
   */
  static getActivityTimeline(userId: string, limit: number = 20): ProfileActivity[] {
    const activities: ProfileActivity[] = [];

    // Get recent biomarker logs
    const biomarkers = Biomarker.findByUserId(userId).slice(0, 10);
    for (const b of biomarkers) {
      activities.push({
        type: 'biomarker',
        title: `Logged ${b.name}`,
        description: `${b.value} ${b.unit}`,
        timestamp: b.timestamp,
        icon: '🧬'
      });
    }

    // Get recent habit completions
    const habits = Habit.findByUserId(userId);
    for (const habit of habits) {
      const logs = habit.getTodaysLog();
      if (logs && logs.completed) {
        activities.push({
          type: 'habit',
          title: `Completed ${habit.name}`,
          description: `Streak: ${habit.current_streak} days`,
          timestamp: logs.logged_at,
          icon: '✅'
        });
      }
    }

    // Get recent points transactions
    const transactions = PointsTransaction.findByUserId(userId, 10);
    for (const t of transactions) {
      if (t.amount > 0) {
        activities.push({
          type: 'points',
          title: `Earned ${t.amount} points`,
          description: t.reason,
          timestamp: t.created_at,
          icon: '🏆'
        });
      }
    }

    // Get recent predictions
    const predictions = LifespanPrediction.findHistoryByUserId(userId, 3);
    for (const p of predictions) {
      activities.push({
        type: 'prediction',
        title: 'Lifespan prediction updated',
        description: `Biological age: ${p.biological_age.toFixed(1)} years`,
        timestamp: p.calculated_at,
        icon: '📊'
      });
    }

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get achievement display data
   */
  static getAchievements(userId: string): {
    earned: { name: string; description: string; icon: string; earned_at: Date }[];
    available: { name: string; description: string; icon: string; criteria: string }[];
  } {
    const db = Database.getInstance();

    const earnedRows = db.all<any>(`
      SELECT a.name, a.description, a.icon, ua.earned_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.achievement_id
      WHERE ua.user_id = ?
      ORDER BY ua.earned_at DESC
    `, [userId]);

    const availableRows = db.all<any>(`
      SELECT name, description, icon, criteria
      FROM achievements
      WHERE achievement_id NOT IN (
        SELECT achievement_id FROM user_achievements WHERE user_id = ?
      )
    `, [userId]);

    return {
      earned: earnedRows.map(r => ({
        name: r.name,
        description: r.description,
        icon: r.icon,
        earned_at: new Date(r.earned_at)
      })),
      available: availableRows.map(r => ({
        name: r.name,
        description: r.description,
        icon: r.icon,
        criteria: r.criteria
      }))
    };
  }

  /**
   * Get AI coaching suggestions based on profile
   */
  static getCoachingSuggestions(userId: string): {
    category: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
  }[] {
    const user = UserProfile.findById(userId);
    if (!user) return [];

    const suggestions: {
      category: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
      action: string;
    }[] = [];

    // Sleep suggestions
    if (user.lifestyle_factors.sleep_avg_hours < 7) {
      suggestions.push({
        category: 'Sleep',
        suggestion: 'Your average sleep is below optimal. Aim for 7-8 hours.',
        priority: 'high',
        action: 'Set a consistent bedtime and create a wind-down routine'
      });
    }

    // Activity suggestions
    if (user.lifestyle_factors.activity_level === ActivityLevel.SEDENTARY) {
      suggestions.push({
        category: 'Exercise',
        suggestion: 'A sedentary lifestyle significantly impacts longevity.',
        priority: 'high',
        action: 'Start with 10-minute walks and gradually increase'
      });
    }

    // Stress suggestions
    if (user.lifestyle_factors.stress_score > 6) {
      suggestions.push({
        category: 'Stress',
        suggestion: 'High stress levels can accelerate aging.',
        priority: 'medium',
        action: 'Try daily meditation or breathing exercises'
      });
    }

    // BMI suggestions
    if (user.bmi >= 25) {
      suggestions.push({
        category: 'Weight',
        suggestion: `Your BMI (${user.bmi}) indicates potential health risks.`,
        priority: user.bmi >= 30 ? 'high' : 'medium',
        action: 'Focus on nutrition and increase physical activity'
      });
    }

    // Smoking
    if (user.lifestyle_factors.smoking_status) {
      suggestions.push({
        category: 'Smoking',
        suggestion: 'Smoking is the #1 modifiable risk factor for longevity.',
        priority: 'high',
        action: 'Consider smoking cessation programs or nicotine replacement'
      });
    }

    // Alcohol
    if (user.lifestyle_factors.alcohol_drinks_per_week > 7) {
      suggestions.push({
        category: 'Alcohol',
        suggestion: 'Reducing alcohol intake can significantly improve health markers.',
        priority: 'medium',
        action: 'Try alcohol-free days and set weekly limits'
      });
    }

    return suggestions;
  }

  /**
   * Get goal setting options
   */
  static getGoalOptions(): {
    category: string;
    goals: { name: string; description: string; target: string; difficulty: string }[];
  }[] {
    return [
      {
        category: 'Longevity',
        goals: [
          { name: 'Reduce Biological Age', description: 'Lower your biological age by 1 year', target: '-1 year', difficulty: 'Medium' },
          { name: 'Reach Centenarian Trajectory', description: 'Achieve predicted lifespan of 95+ years', target: '95 years', difficulty: 'Hard' }
        ]
      },
      {
        category: 'Fitness',
        goals: [
          { name: 'VO2 Max Improvement', description: 'Increase VO2 Max to elite level', target: '50+ mL/kg/min', difficulty: 'Hard' },
          { name: 'Daily Movement', description: 'Hit 10,000 steps every day for a month', target: '30 days', difficulty: 'Medium' }
        ]
      },
      {
        category: 'Habits',
        goals: [
          { name: '30-Day Streak', description: 'Maintain a habit for 30 consecutive days', target: '30 days', difficulty: 'Medium' },
          { name: 'Perfect Week', description: 'Complete all habits every day for a week', target: '7 days', difficulty: 'Easy' }
        ]
      },
      {
        category: 'Biomarkers',
        goals: [
          { name: 'All Green', description: 'Get all biomarkers in optimal range', target: '100% optimal', difficulty: 'Hard' },
          { name: 'Track 10 Biomarkers', description: 'Log at least 10 different biomarkers', target: '10 biomarkers', difficulty: 'Easy' }
        ]
      }
    ];
  }

  /**
   * Format activity level for display
   */
  private static formatActivityLevel(level: ActivityLevel): string {
    const displays: Record<ActivityLevel, string> = {
      [ActivityLevel.SEDENTARY]: 'Sedentary',
      [ActivityLevel.LIGHTLY_ACTIVE]: 'Lightly Active',
      [ActivityLevel.MODERATELY_ACTIVE]: 'Moderately Active',
      [ActivityLevel.VERY_ACTIVE]: 'Very Active',
      [ActivityLevel.EXTREMELY_ACTIVE]: 'Extremely Active'
    };
    return displays[level] || level;
  }

  /**
   * Format diet type for display
   */
  private static formatDietType(type: DietType): string {
    const displays: Record<DietType, string> = {
      [DietType.STANDARD]: 'Standard',
      [DietType.MEDITERRANEAN]: 'Mediterranean',
      [DietType.KETO]: 'Ketogenic',
      [DietType.VEGAN]: 'Vegan',
      [DietType.VEGETARIAN]: 'Vegetarian',
      [DietType.PALEO]: 'Paleo',
      [DietType.INTERMITTENT_FASTING]: 'Intermittent Fasting',
      [DietType.CARNIVORE]: 'Carnivore'
    };
    return displays[type] || type;
  }

  /**
   * Format level for display
   */
  private static formatLevel(level: UserLevel): string {
    const displays: Record<UserLevel, string> = {
      [UserLevel.NOVICE]: 'Novice',
      [UserLevel.BEGINNER]: 'Beginner',
      [UserLevel.INTERMEDIATE]: 'Intermediate',
      [UserLevel.ADVANCED]: 'Advanced',
      [UserLevel.EXPERT]: 'Expert',
      [UserLevel.MASTER]: 'Master',
      [UserLevel.LONGEVITY_CHAMPION]: 'Longevity Champion'
    };
    return displays[level] || level;
  }
}

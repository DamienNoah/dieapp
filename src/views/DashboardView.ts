import { UserProfile } from '../models/UserProfile';
import { Biomarker } from '../models/Biomarker';
import { Habit, HabitLog } from '../models/Habit';
import { Points } from '../models/Points';
import { LifespanPrediction } from '../models/LifespanPrediction';
import { LifespanPredictionService } from '../services/LifespanPredictionService';
import {
  IDashboardData,
  ITodaysHabit,
  IBiomarkerSummary,
  IAchievement,
  RiskLevel,
  ILifespanPrediction
} from '../models/types';
import { Database } from '../database/Database';

/**
 * Dashboard View - Aggregates all data needed for the main dashboard screen
 */
export class DashboardView {
  /**
   * Get complete dashboard data for a user
   */
  static async getDashboardData(userId: string): Promise<IDashboardData | null> {
    const user = UserProfile.findById(userId);
    if (!user) return null;

    // Get or calculate lifespan prediction
    let prediction = LifespanPrediction.findLatestByUserId(userId);
    const biomarkers = Biomarker.getLatestForUser(userId);
    const habits = Habit.findByUserId(userId);

    // Run new prediction if none exists or data has changed significantly
    if (!prediction && biomarkers.length > 0) {
      prediction = LifespanPredictionService.calculatePrediction(user, biomarkers, habits);
      await prediction.save();
    }

    // Get today's habits status
    const todaysHabits = this.getTodaysHabits(habits);

    // Get biomarker summary
    const biomarkerSummary = this.getBiomarkerSummary(userId, biomarkers);

    // Get points
    const points = await Points.getOrCreate(userId);

    // Generate motivational insight
    const motivationalInsight = this.generateInsight(user, prediction, habits, biomarkers);

    // Get recent achievements
    const recentAchievements = this.getRecentAchievements(userId);

    return {
      user: user.toJSON(),
      lifespan_prediction: prediction?.toJSON() || this.getDefaultPrediction(userId, user.age),
      todays_habits: todaysHabits,
      biomarker_summary: biomarkerSummary,
      points: points.toJSON(),
      motivational_insight: motivationalInsight,
      recent_achievements: recentAchievements
    };
  }

  /**
   * Get today's habits with completion status
   */
  private static getTodaysHabits(habits: Habit[]): ITodaysHabit[] {
    return habits.map(habit => ({
      habit: habit.toJSON(),
      completed_today: habit.isCompletedToday(),
      progress_value: habit.getTodaysLog()?.actual_value
    }));
  }

  /**
   * Get biomarker summary for dashboard
   */
  private static getBiomarkerSummary(userId: string, biomarkers: Biomarker[]): IBiomarkerSummary[] {
    const summary: IBiomarkerSummary[] = [];

    for (const biomarker of biomarkers) {
      // Get history to determine trend
      const history = Biomarker.findHistoryByName(userId, biomarker.name, 5);
      let trend: 'improving' | 'stable' | 'declining' = 'stable';

      if (history.length >= 2) {
        const latest = history[0].value;
        const previous = history[1].value;
        const change = latest - previous;

        // Determine if higher or lower is better
        const lowerIsBetter = biomarker.optimal_range_max < biomarker.clinical_range_max;

        if (Math.abs(change) > biomarker.value * 0.05) { // 5% change threshold
          if (lowerIsBetter) {
            trend = change < 0 ? 'improving' : 'declining';
          } else {
            trend = change > 0 ? 'improving' : 'declining';
          }
        }
      }

      // Calculate lifespan impact in days
      const impactYears = biomarker.deviationScore * biomarker.risk_weight * 5;
      const impactDays = Math.round(impactYears * 365);

      summary.push({
        name: biomarker.name,
        latest_value: biomarker.value,
        unit: biomarker.unit,
        risk_level: biomarker.riskLevel,
        trend,
        lifespan_impact_days: impactDays
      });
    }

    // Sort by risk level (worst first) then by impact
    return summary.sort((a, b) => {
      const riskOrder = [RiskLevel.CRITICAL, RiskLevel.HIGH_RISK, RiskLevel.BORDERLINE, RiskLevel.NORMAL, RiskLevel.OPTIMAL];
      const riskDiff = riskOrder.indexOf(a.risk_level) - riskOrder.indexOf(b.risk_level);
      if (riskDiff !== 0) return riskDiff;
      return Math.abs(b.lifespan_impact_days) - Math.abs(a.lifespan_impact_days);
    });
  }

  /**
   * Generate motivational insight for dashboard
   */
  private static generateInsight(
    user: UserProfile,
    prediction: LifespanPrediction | null,
    habits: Habit[],
    biomarkers: Biomarker[]
  ): string {
    const insights: string[] = [];

    // Biological age insight
    if (prediction) {
      const ageDiff = prediction.age_difference;
      if (ageDiff <= -5) {
        insights.push(`Your biological age is ${Math.abs(ageDiff).toFixed(1)} years younger than your actual age - excellent work!`);
      } else if (ageDiff > 5) {
        insights.push(`Focus on the recommended actions to reduce your biological age by up to ${ageDiff.toFixed(1)} years.`);
      }
    }

    // Streak insights
    const activeStreaks = habits.filter(h => h.current_streak >= 7);
    if (activeStreaks.length > 0) {
      const longestStreak = Math.max(...activeStreaks.map(h => h.current_streak));
      insights.push(`Amazing! You have ${activeStreaks.length} habits with week+ streaks. Your longest is ${longestStreak} days.`);
    }

    // Habits completed today
    const completedToday = habits.filter(h => h.isCompletedToday()).length;
    const remainingHabits = habits.length - completedToday;
    if (remainingHabits > 0 && remainingHabits <= habits.length) {
      const potentialPoints = habits
        .filter(h => !h.isCompletedToday())
        .reduce((sum, h) => sum + h.calculatePoints(), 0);
      insights.push(`Complete your ${remainingHabits} remaining habits to earn ${potentialPoints} more points today!`);
    } else if (completedToday === habits.length && habits.length > 0) {
      insights.push(`Incredible! You've completed all ${habits.length} habits today. Your future self thanks you!`);
    }

    // Biomarker insight
    const criticalBiomarkers = biomarkers.filter(b => b.riskLevel === RiskLevel.CRITICAL || b.riskLevel === RiskLevel.HIGH_RISK);
    if (criticalBiomarkers.length > 0) {
      insights.push(`${criticalBiomarkers.length} biomarker(s) need attention. Addressing these could add years to your life.`);
    }

    // Sleep insight
    if (user.lifestyle_factors.sleep_avg_hours < 7) {
      insights.push(`Sleep deficit can reduce your lifespan. Aim for 7-8 hours for optimal longevity.`);
    }

    // Return a random insight or combine multiple
    if (insights.length === 0) {
      return 'Keep logging your biomarkers and completing habits to receive personalized insights!';
    }

    return insights[Math.floor(Math.random() * insights.length)];
  }

  /**
   * Get recent achievements
   */
  private static getRecentAchievements(userId: string): IAchievement[] {
    const db = Database.getInstance();
    const rows = db.all<any>(`
      SELECT a.name, a.description, a.icon, ua.earned_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.achievement_id
      WHERE ua.user_id = ?
      ORDER BY ua.earned_at DESC
      LIMIT 5
    `, [userId]);

    return rows.map(row => ({
      name: row.name,
      description: row.description,
      earned_at: new Date(row.earned_at),
      icon: row.icon
    }));
  }

  /**
   * Get default prediction when no data available
   */
  private static getDefaultPrediction(userId: string, age: number): ILifespanPrediction {
    return {
      prediction_id: '',
      user_id: userId,
      predicted_lifespan_years: 78,
      biological_age: age,
      chronological_age: age,
      age_difference: 0,
      confidence_interval_low: 70,
      confidence_interval_high: 86,
      risk_hotspots: [],
      recommended_actions: [{
        priority: 1,
        action: 'Start by logging your biomarkers and setting up daily habits',
        category: 'getting_started',
        potential_gain_years: 5,
        difficulty: 'easy',
        timeframe: 'Start today'
      }],
      calculated_at: new Date()
    };
  }

  /**
   * Get quick stats for dashboard header
   */
  static async getQuickStats(userId: string): Promise<{
    biological_age: number | null;
    predicted_lifespan: number | null;
    today_points: number;
    active_streaks: number;
    habits_completed_today: number;
    total_habits: number;
  }> {
    const prediction = LifespanPrediction.findLatestByUserId(userId);
    const habits = Habit.findByUserId(userId);
    const todaysLogs = HabitLog.findTodaysLogs(userId);

    const todayPoints = todaysLogs.reduce((sum, log) => sum + (log.points_earned > 0 ? log.points_earned : 0), 0);
    const activeStreaks = habits.filter(h => h.current_streak > 0).length;
    const completedToday = habits.filter(h => h.isCompletedToday()).length;

    return {
      biological_age: prediction?.biological_age || null,
      predicted_lifespan: prediction?.predicted_lifespan_years || null,
      today_points: todayPoints,
      active_streaks: activeStreaks,
      habits_completed_today: completedToday,
      total_habits: habits.length
    };
  }
}

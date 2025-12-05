import { Habit, HabitLog, HABIT_TEMPLATES } from '../models/Habit';
import { HabitFrequency } from '../models/types';

/**
 * Interfaces for habit views
 */
export interface HabitCard {
  habit_id: string;
  name: string;
  description: string | undefined;
  type: string;
  target: string;
  frequency: HabitFrequency;
  completed_today: boolean;
  current_streak: number;
  longest_streak: number;
  success_rate: number;
  points_available: number;
  streak_status: 'fire' | 'active' | 'new' | 'broken';
  next_milestone: { days: number; bonus: number } | null;
  animation_state: 'celebration' | 'pending' | 'failed' | null;
}

export interface HabitCalendarDay {
  date: string;
  day_of_week: string;
  habits: {
    habit_id: string;
    name: string;
    completed: boolean;
  }[];
  total_completed: number;
  total_habits: number;
  completion_rate: number;
}

export interface StreakLeaderboard {
  habit_id: string;
  name: string;
  current_streak: number;
  longest_streak: number;
  type: string;
  emoji: string;
}

export interface HabitStats {
  total_habits: number;
  completed_today: number;
  total_completions_all_time: number;
  total_points_earned: number;
  average_success_rate: number;
  longest_ever_streak: number;
  most_consistent_habit: string | null;
}

/**
 * Habit View - Formats habit data for UI components
 */
export class HabitView {
  /**
   * Get habit cards for the habit list
   */
  static getHabitCards(userId: string): HabitCard[] {
    const habits = Habit.findByUserId(userId);
    return habits.map(h => this.formatHabitCard(h));
  }

  /**
   * Format a single habit as a card
   */
  private static formatHabitCard(habit: Habit): HabitCard {
    const completedToday = habit.isCompletedToday();
    const todaysLog = habit.getTodaysLog();

    // Determine streak status
    let streakStatus: 'fire' | 'active' | 'new' | 'broken' = 'new';
    if (habit.current_streak >= 7) {
      streakStatus = 'fire';
    } else if (habit.current_streak > 0) {
      streakStatus = completedToday ? 'active' : 'broken';
    }

    // Calculate next milestone
    let nextMilestone: { days: number; bonus: number } | null = null;
    if (habit.current_streak < 7) {
      nextMilestone = { days: 7 - habit.current_streak, bonus: 50 };
    } else if (habit.current_streak < 30) {
      nextMilestone = { days: 30 - habit.current_streak, bonus: 200 };
    } else if (habit.current_streak < 100) {
      nextMilestone = { days: 100 - habit.current_streak, bonus: 1000 };
    }

    // Determine animation state
    let animationState: 'celebration' | 'pending' | 'failed' | null = null;
    if (todaysLog) {
      animationState = todaysLog.completed ? 'celebration' : 'failed';
    } else if (!completedToday) {
      animationState = 'pending';
    }

    return {
      habit_id: habit.habit_id,
      name: habit.name,
      description: habit.description,
      type: habit.type,
      target: `${habit.target_value} ${habit.target_unit}`,
      frequency: habit.frequency,
      completed_today: completedToday,
      current_streak: habit.current_streak,
      longest_streak: habit.longest_streak,
      success_rate: habit.success_rate,
      points_available: habit.calculatePoints(),
      streak_status: streakStatus,
      next_milestone: nextMilestone,
      animation_state: animationState
    };
  }

  /**
   * Get calendar view data for a month
   */
  static getCalendarView(userId: string, year: number, month: number): HabitCalendarDay[] {
    const habits = Habit.findByUserId(userId);
    const logs = HabitLog.findByUserId(userId, 1000);

    // Get all days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarDays: HabitCalendarDay[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

      // Get logs for this day
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.logged_at).toISOString().split('T')[0];
        return logDate === dateStr;
      });

      // Build habit completion status
      const habitStatuses = habits.map(habit => {
        const log = dayLogs.find(l => l.habit_id === habit.habit_id);
        return {
          habit_id: habit.habit_id,
          name: habit.name,
          completed: log?.completed || false
        };
      });

      const completedCount = habitStatuses.filter(h => h.completed).length;

      calendarDays.push({
        date: dateStr,
        day_of_week: dayOfWeek,
        habits: habitStatuses,
        total_completed: completedCount,
        total_habits: habits.length,
        completion_rate: habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0
      });
    }

    return calendarDays;
  }

  /**
   * Get streak leaderboard
   */
  static getStreakLeaderboard(userId: string): StreakLeaderboard[] {
    const habits = Habit.findByUserId(userId);

    return habits
      .map(h => ({
        habit_id: h.habit_id,
        name: h.name,
        current_streak: h.current_streak,
        longest_streak: h.longest_streak,
        type: h.type,
        emoji: this.getHabitEmoji(h.type)
      }))
      .sort((a, b) => b.current_streak - a.current_streak);
  }

  /**
   * Get habit statistics
   */
  static getHabitStats(userId: string): HabitStats {
    const habits = Habit.findByUserId(userId);
    const logs = HabitLog.findByUserId(userId, 10000);

    const completedToday = habits.filter(h => h.isCompletedToday()).length;
    const totalCompletions = logs.filter(l => l.completed).length;
    const totalPoints = logs.reduce((sum, l) => sum + (l.points_earned > 0 ? l.points_earned : 0), 0);
    const avgSuccessRate = habits.length > 0
      ? habits.reduce((sum, h) => sum + h.success_rate, 0) / habits.length
      : 0;
    const longestStreak = Math.max(...habits.map(h => h.longest_streak), 0);

    // Find most consistent habit
    let mostConsistent: string | null = null;
    if (habits.length > 0) {
      const sortedBySuccess = [...habits].sort((a, b) => b.success_rate - a.success_rate);
      if (sortedBySuccess[0].success_rate > 0) {
        mostConsistent = sortedBySuccess[0].name;
      }
    }

    return {
      total_habits: habits.length,
      completed_today: completedToday,
      total_completions_all_time: totalCompletions,
      total_points_earned: totalPoints,
      average_success_rate: Math.round(avgSuccessRate),
      longest_ever_streak: longestStreak,
      most_consistent_habit: mostConsistent
    };
  }

  /**
   * Get habit templates for adding new habits
   */
  static getHabitTemplates(): {
    key: string;
    name: string;
    description: string;
    type: string;
    target: string;
    frequency: string;
    points: number;
    emoji: string;
  }[] {
    return Object.entries(HABIT_TEMPLATES).map(([key, template]) => ({
      key,
      name: template.name || '',
      description: template.description || '',
      type: template.type || '',
      target: `${template.target_value} ${template.target_unit}`,
      frequency: template.frequency || 'daily',
      points: template.points_per_completion || 10,
      emoji: this.getHabitEmoji(template.type || '')
    }));
  }

  /**
   * Get today's progress summary
   */
  static getTodayProgress(userId: string): {
    completed: number;
    total: number;
    percentage: number;
    points_earned: number;
    points_remaining: number;
    status: 'complete' | 'in_progress' | 'not_started';
  } {
    const habits = Habit.findByUserId(userId);
    const completed = habits.filter(h => h.isCompletedToday()).length;
    const pointsEarned = habits
      .filter(h => h.isCompletedToday())
      .reduce((sum, h) => sum + h.calculatePoints(), 0);
    const pointsRemaining = habits
      .filter(h => !h.isCompletedToday())
      .reduce((sum, h) => sum + h.calculatePoints(), 0);

    let status: 'complete' | 'in_progress' | 'not_started' = 'not_started';
    if (completed === habits.length && habits.length > 0) {
      status = 'complete';
    } else if (completed > 0) {
      status = 'in_progress';
    }

    return {
      completed,
      total: habits.length,
      percentage: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0,
      points_earned: pointsEarned,
      points_remaining: pointsRemaining,
      status
    };
  }

  /**
   * Get emoji for habit type
   */
  private static getHabitEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      sleep: '😴',
      exercise: '💪',
      diet: '🥗',
      meditation: '🧘',
      no_alcohol: '🚫🍺',
      no_smoking: '🚭',
      hydration: '💧',
      supplements: '💊',
      cold_exposure: '🥶',
      sauna: '🔥',
      walking: '🚶',
      strength_training: '🏋️',
      zone_2_cardio: '❤️',
      fasting: '⏰'
    };
    return emojiMap[type] || '✅';
  }
}

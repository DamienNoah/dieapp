import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/Database';
import { IHabit, IHabitLog, HabitType, HabitFrequency } from './types';

// Default habit templates
export const HABIT_TEMPLATES: Record<string, Partial<IHabit>> = {
  sleep_8_hours: {
    type: HabitType.SLEEP,
    name: '8 Hours of Sleep',
    description: 'Get at least 8 hours of quality sleep',
    target_value: 8,
    target_unit: 'hours',
    frequency: HabitFrequency.DAILY,
    points_per_completion: 10,
    streak_bonus_multiplier: 1.5,
    streak_break_penalty: 5
  },
  exercise_30_min: {
    type: HabitType.EXERCISE,
    name: '30 Minutes Exercise',
    description: 'Complete at least 30 minutes of exercise',
    target_value: 30,
    target_unit: 'minutes',
    frequency: HabitFrequency.DAILY,
    points_per_completion: 15,
    streak_bonus_multiplier: 1.5,
    streak_break_penalty: 8
  },
  steps_10k: {
    type: HabitType.WALKING,
    name: '10,000 Steps',
    description: 'Walk at least 10,000 steps',
    target_value: 10000,
    target_unit: 'steps',
    frequency: HabitFrequency.DAILY,
    points_per_completion: 12,
    streak_bonus_multiplier: 1.3,
    streak_break_penalty: 6
  },
  meditation_15_min: {
    type: HabitType.MEDITATION,
    name: '15 Minutes Meditation',
    description: 'Practice meditation for at least 15 minutes',
    target_value: 15,
    target_unit: 'minutes',
    frequency: HabitFrequency.DAILY,
    points_per_completion: 10,
    streak_bonus_multiplier: 1.4,
    streak_break_penalty: 5
  },
  no_alcohol: {
    type: HabitType.NO_ALCOHOL,
    name: 'No Alcohol',
    description: 'Avoid alcohol consumption',
    target_value: 1,
    target_unit: 'day',
    frequency: HabitFrequency.DAILY,
    points_per_completion: 8,
    streak_bonus_multiplier: 2.0,
    streak_break_penalty: 10
  },
  zone_2_cardio: {
    type: HabitType.ZONE_2_CARDIO,
    name: 'Zone 2 Cardio (45 min)',
    description: 'Complete 45 minutes of zone 2 heart rate training',
    target_value: 45,
    target_unit: 'minutes',
    frequency: HabitFrequency.WEEKLY,
    points_per_completion: 25,
    streak_bonus_multiplier: 1.5,
    streak_break_penalty: 15
  },
  strength_training: {
    type: HabitType.STRENGTH_TRAINING,
    name: 'Strength Training',
    description: 'Complete a strength training session',
    target_value: 1,
    target_unit: 'session',
    frequency: HabitFrequency.WEEKLY,
    points_per_completion: 20,
    streak_bonus_multiplier: 1.4,
    streak_break_penalty: 10
  },
  hydration: {
    type: HabitType.HYDRATION,
    name: 'Drink 8 Glasses of Water',
    description: 'Stay hydrated with at least 8 glasses of water',
    target_value: 8,
    target_unit: 'glasses',
    frequency: HabitFrequency.DAILY,
    points_per_completion: 5,
    streak_bonus_multiplier: 1.2,
    streak_break_penalty: 3
  },
  cold_exposure: {
    type: HabitType.COLD_EXPOSURE,
    name: 'Cold Exposure (3 min)',
    description: 'Cold shower or ice bath for at least 3 minutes',
    target_value: 3,
    target_unit: 'minutes',
    frequency: HabitFrequency.DAILY,
    points_per_completion: 15,
    streak_bonus_multiplier: 1.6,
    streak_break_penalty: 8
  },
  sauna: {
    type: HabitType.SAUNA,
    name: 'Sauna Session (20 min)',
    description: 'Complete a 20-minute sauna session',
    target_value: 20,
    target_unit: 'minutes',
    frequency: HabitFrequency.WEEKLY,
    points_per_completion: 18,
    streak_bonus_multiplier: 1.4,
    streak_break_penalty: 10
  },
  intermittent_fasting: {
    type: HabitType.FASTING,
    name: 'Intermittent Fasting (16:8)',
    description: 'Complete 16-hour fasting window',
    target_value: 16,
    target_unit: 'hours',
    frequency: HabitFrequency.DAILY,
    points_per_completion: 12,
    streak_bonus_multiplier: 1.5,
    streak_break_penalty: 7
  }
};

export class Habit implements IHabit {
  habit_id: string;
  user_id: string;
  type: HabitType;
  name: string;
  description?: string;
  target_value: number;
  target_unit: string;
  frequency: HabitFrequency;
  current_streak: number;
  longest_streak: number;
  success_rate: number;
  points_per_completion: number;
  streak_bonus_multiplier: number;
  streak_break_penalty: number;
  created_at: Date;
  updated_at: Date;

  constructor(data: Partial<IHabit>) {
    this.habit_id = data.habit_id || uuidv4();
    this.user_id = data.user_id || '';
    this.type = data.type || HabitType.EXERCISE;
    this.name = data.name || '';
    this.description = data.description;
    this.target_value = data.target_value || 1;
    this.target_unit = data.target_unit || 'units';
    this.frequency = data.frequency || HabitFrequency.DAILY;
    this.current_streak = data.current_streak || 0;
    this.longest_streak = data.longest_streak || 0;
    this.success_rate = data.success_rate || 0;
    this.points_per_completion = data.points_per_completion || 10;
    this.streak_bonus_multiplier = data.streak_bonus_multiplier || 1.5;
    this.streak_break_penalty = data.streak_break_penalty || 5;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  // Calculate points for completing habit
  calculatePoints(): number {
    let points = this.points_per_completion;

    // Apply streak bonus for streaks > 7 days
    if (this.current_streak >= 7) {
      const bonusMultiplier = 1 + ((this.current_streak - 7) * 0.05);
      points = Math.round(points * Math.min(bonusMultiplier, this.streak_bonus_multiplier));
    }

    return points;
  }

  // Save to database
  async save(): Promise<Habit> {
    const db = Database.getInstance();
    this.updated_at = new Date();

    db.run(`
      INSERT OR REPLACE INTO habits (
        habit_id, user_id, type, name, description,
        target_value, target_unit, frequency,
        current_streak, longest_streak, success_rate,
        points_per_completion, streak_bonus_multiplier, streak_break_penalty,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.habit_id,
      this.user_id,
      this.type,
      this.name,
      this.description || null,
      this.target_value,
      this.target_unit,
      this.frequency,
      this.current_streak,
      this.longest_streak,
      this.success_rate,
      this.points_per_completion,
      this.streak_bonus_multiplier,
      this.streak_break_penalty,
      this.created_at.toISOString(),
      this.updated_at.toISOString()
    ]);

    return this;
  }

  // Find by ID
  static findById(habitId: string): Habit | null {
    const db = Database.getInstance();
    const row = db.get<any>('SELECT * FROM habits WHERE habit_id = ?', [habitId]);

    if (!row) return null;
    return Habit.fromRow(row);
  }

  // Find all habits for a user
  static findByUserId(userId: string): Habit[] {
    const db = Database.getInstance();
    const rows = db.all<any>(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return rows.map(row => Habit.fromRow(row));
  }

  // Create habit from template
  static createFromTemplate(userId: string, templateKey: string): Habit {
    const template = HABIT_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`Unknown habit template: ${templateKey}`);
    }

    return new Habit({
      user_id: userId,
      ...template
    });
  }

  // Log habit completion
  async logCompletion(completed: boolean, actualValue?: number, notes?: string): Promise<HabitLog> {
    const log = new HabitLog({
      habit_id: this.habit_id,
      user_id: this.user_id,
      completed,
      actual_value: actualValue,
      notes,
      points_earned: completed ? this.calculatePoints() : -this.streak_break_penalty
    });

    // Update streak
    if (completed) {
      this.current_streak++;
      if (this.current_streak > this.longest_streak) {
        this.longest_streak = this.current_streak;
      }
    } else {
      this.current_streak = 0;
    }

    // Update success rate
    const logs = HabitLog.findByHabitId(this.habit_id);
    const completedCount = logs.filter(l => l.completed).length + (completed ? 1 : 0);
    this.success_rate = Math.round((completedCount / (logs.length + 1)) * 100);

    await log.save();
    await this.save();

    return log;
  }

  // Check if habit was completed today
  isCompletedToday(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = HabitLog.findByHabitId(this.habit_id);
    return logs.some(log => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime() && log.completed;
    });
  }

  // Get today's log
  getTodaysLog(): HabitLog | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = HabitLog.findByHabitId(this.habit_id);
    const todaysLog = logs.find(log => {
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });

    return todaysLog || null;
  }

  // Delete habit
  async delete(): Promise<void> {
    const db = Database.getInstance();
    db.run('DELETE FROM habit_logs WHERE habit_id = ?', [this.habit_id]);
    db.run('DELETE FROM habits WHERE habit_id = ?', [this.habit_id]);
  }

  // Convert database row to Habit
  private static fromRow(row: any): Habit {
    return new Habit({
      habit_id: row.habit_id,
      user_id: row.user_id,
      type: row.type as HabitType,
      name: row.name,
      description: row.description,
      target_value: row.target_value,
      target_unit: row.target_unit,
      frequency: row.frequency as HabitFrequency,
      current_streak: row.current_streak,
      longest_streak: row.longest_streak,
      success_rate: row.success_rate,
      points_per_completion: row.points_per_completion,
      streak_bonus_multiplier: row.streak_bonus_multiplier,
      streak_break_penalty: row.streak_break_penalty,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    });
  }

  // Convert to JSON
  toJSON(): IHabit {
    return {
      habit_id: this.habit_id,
      user_id: this.user_id,
      type: this.type,
      name: this.name,
      description: this.description,
      target_value: this.target_value,
      target_unit: this.target_unit,
      frequency: this.frequency,
      current_streak: this.current_streak,
      longest_streak: this.longest_streak,
      success_rate: this.success_rate,
      points_per_completion: this.points_per_completion,
      streak_bonus_multiplier: this.streak_bonus_multiplier,
      streak_break_penalty: this.streak_break_penalty,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export class HabitLog implements IHabitLog {
  log_id: string;
  habit_id: string;
  user_id: string;
  completed: boolean;
  actual_value?: number;
  notes?: string;
  points_earned: number;
  logged_at: Date;

  constructor(data: Partial<IHabitLog>) {
    this.log_id = data.log_id || uuidv4();
    this.habit_id = data.habit_id || '';
    this.user_id = data.user_id || '';
    this.completed = data.completed || false;
    this.actual_value = data.actual_value;
    this.notes = data.notes;
    this.points_earned = data.points_earned || 0;
    this.logged_at = data.logged_at || new Date();
  }

  // Save to database
  async save(): Promise<HabitLog> {
    const db = Database.getInstance();

    db.run(`
      INSERT OR REPLACE INTO habit_logs (
        log_id, habit_id, user_id, completed,
        actual_value, notes, points_earned, logged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.log_id,
      this.habit_id,
      this.user_id,
      this.completed ? 1 : 0,
      this.actual_value || null,
      this.notes || null,
      this.points_earned,
      this.logged_at.toISOString()
    ]);

    return this;
  }

  // Find logs by habit ID
  static findByHabitId(habitId: string): HabitLog[] {
    const db = Database.getInstance();
    const rows = db.all<any>(
      'SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY logged_at DESC',
      [habitId]
    );

    return rows.map(row => HabitLog.fromRow(row));
  }

  // Find logs by user ID
  static findByUserId(userId: string, limit: number = 100): HabitLog[] {
    const db = Database.getInstance();
    const rows = db.all<any>(
      'SELECT * FROM habit_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT ?',
      [userId, limit]
    );

    return rows.map(row => HabitLog.fromRow(row));
  }

  // Find today's logs for a user
  static findTodaysLogs(userId: string): HabitLog[] {
    const db = Database.getInstance();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const rows = db.all<any>(
      'SELECT * FROM habit_logs WHERE user_id = ? AND logged_at >= ? AND logged_at < ?',
      [userId, today.toISOString(), tomorrow.toISOString()]
    );

    return rows.map(row => HabitLog.fromRow(row));
  }

  // Convert database row to HabitLog
  private static fromRow(row: any): HabitLog {
    return new HabitLog({
      log_id: row.log_id,
      habit_id: row.habit_id,
      user_id: row.user_id,
      completed: Boolean(row.completed),
      actual_value: row.actual_value,
      notes: row.notes,
      points_earned: row.points_earned,
      logged_at: new Date(row.logged_at)
    });
  }

  // Convert to JSON
  toJSON(): IHabitLog {
    return {
      log_id: this.log_id,
      habit_id: this.habit_id,
      user_id: this.user_id,
      completed: this.completed,
      actual_value: this.actual_value,
      notes: this.notes,
      points_earned: this.points_earned,
      logged_at: this.logged_at
    };
  }
}

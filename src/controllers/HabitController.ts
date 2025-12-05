import { Request, Response } from 'express';
import { Habit, HabitLog, HABIT_TEMPLATES } from '../models/Habit';
import { UserProfile } from '../models/UserProfile';
import { Points } from '../models/Points';
import { IApiResponse, IHabit, IHabitLog, HabitType, HabitFrequency } from '../models/types';

interface HabitWithStatus extends IHabit {
  completed_today: boolean;
  todays_points: number;
}

interface StreakInfo {
  habit_id: string;
  name: string;
  current_streak: number;
  longest_streak: number;
  streak_status: 'active' | 'broken' | 'new';
  days_until_bonus: number;
}

export class HabitController {
  // Create a new habit from template
  static async createFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { template_key } = req.body;

      // Verify user exists
      const user = UserProfile.findById(userId);
      if (!user) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      // Validate template key
      if (!HABIT_TEMPLATES[template_key]) {
        const response: IApiResponse<null> = {
          success: false,
          error: `Unknown habit template: ${template_key}. Valid options: ${Object.keys(HABIT_TEMPLATES).join(', ')}`
        };
        res.status(400).json(response);
        return;
      }

      const habit = Habit.createFromTemplate(userId, template_key);
      await habit.save();

      const response: IApiResponse<IHabit> = {
        success: true,
        data: habit.toJSON(),
        message: 'Habit created successfully'
      };
      res.status(201).json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create habit'
      };
      res.status(500).json(response);
    }
  }

  // Create a custom habit
  static async createCustomHabit(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        type,
        name,
        description,
        target_value,
        target_unit,
        frequency,
        points_per_completion,
        streak_bonus_multiplier,
        streak_break_penalty
      } = req.body;

      // Verify user exists
      const user = UserProfile.findById(userId);
      if (!user) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      const habit = new Habit({
        user_id: userId,
        type: type as HabitType || HabitType.EXERCISE,
        name,
        description,
        target_value: target_value || 1,
        target_unit: target_unit || 'units',
        frequency: frequency as HabitFrequency || HabitFrequency.DAILY,
        points_per_completion: points_per_completion || 10,
        streak_bonus_multiplier: streak_bonus_multiplier || 1.5,
        streak_break_penalty: streak_break_penalty || 5
      });

      await habit.save();

      const response: IApiResponse<IHabit> = {
        success: true,
        data: habit.toJSON(),
        message: 'Custom habit created successfully'
      };
      res.status(201).json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create custom habit'
      };
      res.status(500).json(response);
    }
  }

  // Get all habits for user
  static async getHabits(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const habits = Habit.findByUserId(userId);
      const habitsWithStatus: HabitWithStatus[] = habits.map(habit => ({
        ...habit.toJSON(),
        completed_today: habit.isCompletedToday(),
        todays_points: habit.isCompletedToday() ? habit.calculatePoints() : 0
      }));

      const response: IApiResponse<HabitWithStatus[]> = {
        success: true,
        data: habitsWithStatus
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch habits'
      };
      res.status(500).json(response);
    }
  }

  // Get habit templates
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = Object.entries(HABIT_TEMPLATES).map(([key, template]) => ({
        key,
        ...template
      }));

      const response: IApiResponse<typeof templates> = {
        success: true,
        data: templates
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates'
      };
      res.status(500).json(response);
    }
  }

  // Check off a habit (log completion)
  static async checkOffHabit(req: Request, res: Response): Promise<void> {
    try {
      const { habitId } = req.params;
      const { actual_value, notes } = req.body;

      const habit = Habit.findById(habitId);
      if (!habit) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Habit not found'
        };
        res.status(404).json(response);
        return;
      }

      // Check if already completed today
      if (habit.isCompletedToday()) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Habit already completed today'
        };
        res.status(400).json(response);
        return;
      }

      // Log completion
      const log = await habit.logCompletion(true, actual_value, notes);

      // Update user points
      const points = await Points.getOrCreate(habit.user_id);
      await points.addPoints(log.points_earned, `Completed habit: ${habit.name}`, 'habit_completion');

      // Check for streak milestones
      let bonusMessage = '';
      if (habit.current_streak === 7) {
        const bonusPoints = 50;
        await points.addPoints(bonusPoints, '7-day streak bonus!', 'streak_bonus');
        bonusMessage = ` You earned a 7-day streak bonus of ${bonusPoints} points!`;
      } else if (habit.current_streak === 30) {
        const bonusPoints = 200;
        await points.addPoints(bonusPoints, '30-day streak bonus!', 'streak_bonus');
        bonusMessage = ` You earned a 30-day streak bonus of ${bonusPoints} points!`;
      } else if (habit.current_streak === 100) {
        const bonusPoints = 1000;
        await points.addPoints(bonusPoints, '100-day streak bonus!', 'streak_bonus');
        bonusMessage = ` Incredible! 100-day streak bonus of ${bonusPoints} points!`;
      }

      const response: IApiResponse<{ habit: IHabit; log: IHabitLog; points_earned: number }> = {
        success: true,
        data: {
          habit: habit.toJSON(),
          log: log.toJSON(),
          points_earned: log.points_earned
        },
        message: `Habit completed! You earned ${log.points_earned} points. Current streak: ${habit.current_streak} days.${bonusMessage}`
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check off habit'
      };
      res.status(500).json(response);
    }
  }

  // Log habit failure (missed day)
  static async logFailure(req: Request, res: Response): Promise<void> {
    try {
      const { habitId } = req.params;
      const { notes } = req.body;

      const habit = Habit.findById(habitId);
      if (!habit) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Habit not found'
        };
        res.status(404).json(response);
        return;
      }

      // Log failure
      const log = await habit.logCompletion(false, undefined, notes);

      // Deduct points
      const points = await Points.getOrCreate(habit.user_id);
      if (Math.abs(log.points_earned) > 0) {
        await points.subtractPoints(Math.abs(log.points_earned), `Missed habit: ${habit.name}`);
      }

      const response: IApiResponse<{ habit: IHabit; log: IHabitLog }> = {
        success: true,
        data: {
          habit: habit.toJSON(),
          log: log.toJSON()
        },
        message: `Streak broken. Lost ${Math.abs(log.points_earned)} points. Don't give up!`
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log habit failure'
      };
      res.status(500).json(response);
    }
  }

  // Get streak information for all habits
  static async getStreakInfo(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const habits = Habit.findByUserId(userId);
      const streakInfo: StreakInfo[] = habits.map(habit => {
        const completedToday = habit.isCompletedToday();
        let streakStatus: 'active' | 'broken' | 'new' = 'new';

        if (habit.current_streak > 0) {
          streakStatus = completedToday ? 'active' : 'broken';
        }

        const daysUntilBonus = habit.current_streak < 7 ? 7 - habit.current_streak :
                              habit.current_streak < 30 ? 30 - habit.current_streak :
                              habit.current_streak < 100 ? 100 - habit.current_streak : 0;

        return {
          habit_id: habit.habit_id,
          name: habit.name,
          current_streak: habit.current_streak,
          longest_streak: habit.longest_streak,
          streak_status: streakStatus,
          days_until_bonus: daysUntilBonus
        };
      });

      const response: IApiResponse<StreakInfo[]> = {
        success: true,
        data: streakInfo
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch streak info'
      };
      res.status(500).json(response);
    }
  }

  // Get habit logs/history
  static async getHabitLogs(req: Request, res: Response): Promise<void> {
    try {
      const { habitId } = req.params;
      const limit = parseInt(req.query.limit as string) || 30;

      const logs = HabitLog.findByHabitId(habitId).slice(0, limit);

      const response: IApiResponse<IHabitLog[]> = {
        success: true,
        data: logs.map(l => l.toJSON())
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch habit logs'
      };
      res.status(500).json(response);
    }
  }

  // Get today's habits with completion status
  static async getTodaysHabits(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const habits = Habit.findByUserId(userId);
      const todaysLogs = HabitLog.findTodaysLogs(userId);

      const todaysHabits = habits.map(habit => {
        const todaysLog = todaysLogs.find(l => l.habit_id === habit.habit_id);
        return {
          habit: habit.toJSON(),
          completed_today: todaysLog?.completed || false,
          todays_log: todaysLog?.toJSON() || null,
          potential_points: habit.calculatePoints()
        };
      });

      const totalPotentialPoints = todaysHabits
        .filter(h => !h.completed_today)
        .reduce((sum, h) => sum + h.potential_points, 0);

      const response: IApiResponse<{ habits: typeof todaysHabits; total_potential_points: number }> = {
        success: true,
        data: {
          habits: todaysHabits,
          total_potential_points: totalPotentialPoints
        }
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch today\'s habits'
      };
      res.status(500).json(response);
    }
  }

  // Update habit
  static async updateHabit(req: Request, res: Response): Promise<void> {
    try {
      const { habitId } = req.params;
      const updates = req.body;

      const habit = Habit.findById(habitId);
      if (!habit) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Habit not found'
        };
        res.status(404).json(response);
        return;
      }

      // Apply updates
      if (updates.name) habit.name = updates.name;
      if (updates.description) habit.description = updates.description;
      if (updates.target_value) habit.target_value = updates.target_value;
      if (updates.target_unit) habit.target_unit = updates.target_unit;
      if (updates.points_per_completion) habit.points_per_completion = updates.points_per_completion;

      await habit.save();

      const response: IApiResponse<IHabit> = {
        success: true,
        data: habit.toJSON(),
        message: 'Habit updated successfully'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update habit'
      };
      res.status(500).json(response);
    }
  }

  // Delete habit
  static async deleteHabit(req: Request, res: Response): Promise<void> {
    try {
      const { habitId } = req.params;

      const habit = Habit.findById(habitId);
      if (!habit) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Habit not found'
        };
        res.status(404).json(response);
        return;
      }

      await habit.delete();

      const response: IApiResponse<null> = {
        success: true,
        message: 'Habit deleted successfully'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete habit'
      };
      res.status(500).json(response);
    }
  }

  // Get habit calendar view
  static async getCalendarView(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { month, year } = req.query;

      const targetMonth = parseInt(month as string) || new Date().getMonth();
      const targetYear = parseInt(year as string) || new Date().getFullYear();

      const logs = HabitLog.findByUserId(userId);

      // Filter logs for the specified month
      const monthLogs = logs.filter(log => {
        const logDate = new Date(log.logged_at);
        return logDate.getMonth() === targetMonth && logDate.getFullYear() === targetYear;
      });

      // Group by date
      const calendar: Record<string, { completed: string[]; failed: string[] }> = {};

      for (const log of monthLogs) {
        const dateKey = new Date(log.logged_at).toISOString().split('T')[0];
        if (!calendar[dateKey]) {
          calendar[dateKey] = { completed: [], failed: [] };
        }

        const habit = Habit.findById(log.habit_id);
        const habitName = habit?.name || 'Unknown';

        if (log.completed) {
          calendar[dateKey].completed.push(habitName);
        } else {
          calendar[dateKey].failed.push(habitName);
        }
      }

      const response: IApiResponse<typeof calendar> = {
        success: true,
        data: calendar
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendar view'
      };
      res.status(500).json(response);
    }
  }
}

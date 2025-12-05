import { UserProfile } from '../models/UserProfile';
import { Habit } from '../models/Habit';
import { Biomarker } from '../models/Biomarker';
import { LifespanPrediction } from '../models/LifespanPrediction';
import { RiskLevel } from '../models/types';

/**
 * Notification types
 */
export enum NotificationType {
  HABIT_REMINDER = 'habit_reminder',
  STREAK_AT_RISK = 'streak_at_risk',
  BIOMARKER_ALERT = 'biomarker_alert',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  WEEKLY_SUMMARY = 'weekly_summary',
  MOTIVATION = 'motivation',
  LEVEL_UP = 'level_up'
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  created_at: Date;
  read: boolean;
}

/**
 * Service for managing notifications and reminders
 * In a real implementation, this would integrate with push notification services
 */
export class NotificationService {
  // In-memory store for demo (would be database in production)
  private static notifications: Notification[] = [];

  /**
   * Generate habit reminder notifications
   */
  static async generateHabitReminders(userId: string): Promise<Notification[]> {
    const habits = Habit.findByUserId(userId);
    const notifications: Notification[] = [];

    for (const habit of habits) {
      if (!habit.isCompletedToday()) {
        // Check time of day for appropriate reminders
        const now = new Date();
        const hour = now.getHours();

        // Morning reminder for daily habits
        if (hour >= 8 && hour <= 10) {
          notifications.push(this.createNotification(
            userId,
            NotificationType.HABIT_REMINDER,
            `Don't forget: ${habit.name}`,
            `You're ${habit.current_streak} days into your streak! Keep it going!`,
            `/habits/${habit.habit_id}`
          ));
        }

        // Evening reminder if not completed
        if (hour >= 18 && hour <= 20 && habit.current_streak > 0) {
          notifications.push(this.createNotification(
            userId,
            NotificationType.STREAK_AT_RISK,
            `Streak at risk: ${habit.name}`,
            `Your ${habit.current_streak}-day streak will break if you don't complete this today!`,
            `/habits/${habit.habit_id}`
          ));
        }
      }
    }

    return notifications;
  }

  /**
   * Generate biomarker alert notifications
   */
  static async generateBiomarkerAlerts(userId: string): Promise<Notification[]> {
    const biomarkers = Biomarker.getLatestForUser(userId);
    const notifications: Notification[] = [];

    for (const biomarker of biomarkers) {
      if (biomarker.riskLevel === RiskLevel.CRITICAL) {
        notifications.push(this.createNotification(
          userId,
          NotificationType.BIOMARKER_ALERT,
          `Critical: ${biomarker.name} needs attention`,
          `Your ${biomarker.name} (${biomarker.value} ${biomarker.unit}) is outside safe ranges. Please consult a healthcare provider.`,
          `/biomarkers/${biomarker.name}`
        ));
      } else if (biomarker.riskLevel === RiskLevel.HIGH_RISK) {
        notifications.push(this.createNotification(
          userId,
          NotificationType.BIOMARKER_ALERT,
          `Warning: ${biomarker.name}`,
          `Your ${biomarker.name} is elevated. Consider the recommended actions to improve it.`,
          `/biomarkers/${biomarker.name}`
        ));
      }
    }

    return notifications;
  }

  /**
   * Generate weekly summary notification
   */
  static async generateWeeklySummary(userId: string): Promise<Notification | null> {
    const user = UserProfile.findById(userId);
    if (!user) return null;

    const habits = Habit.findByUserId(userId);
    const prediction = LifespanPrediction.findLatestByUserId(userId);

    // Calculate weekly stats
    const completedHabits = habits.filter(h => h.isCompletedToday()).length;
    const totalHabits = habits.length;
    const longestStreak = Math.max(...habits.map(h => h.current_streak), 0);

    let message = `This week: ${completedHabits}/${totalHabits} habits today. `;
    message += `Longest active streak: ${longestStreak} days. `;

    if (prediction) {
      message += `Biological age: ${prediction.biological_age.toFixed(1)} years. `;
      if (prediction.age_difference < 0) {
        message += `You're ${Math.abs(prediction.age_difference).toFixed(1)} years younger than your chronological age!`;
      }
    }

    return this.createNotification(
      userId,
      NotificationType.WEEKLY_SUMMARY,
      'Your Weekly Longevity Summary',
      message,
      '/dashboard'
    );
  }

  /**
   * Generate motivational notification
   */
  static generateMotivationalNotification(userId: string): Notification {
    const motivationalMessages = [
      {
        title: 'Every Step Counts',
        message: 'Small daily improvements lead to stunning long-term results. Keep going!'
      },
      {
        title: 'Consistency is Key',
        message: 'It\'s not about being perfect, it\'s about being consistent. You\'re doing great!'
      },
      {
        title: 'Invest in Yourself',
        message: 'The habits you build today are an investment in your future self.'
      },
      {
        title: 'Progress Over Perfection',
        message: 'Focus on progress, not perfection. Every healthy choice matters.'
      },
      {
        title: 'Your Future Self Will Thank You',
        message: 'The work you put in today adds years to your life. Keep pushing!'
      },
      {
        title: 'Longevity is Built Daily',
        message: 'Each day is an opportunity to add quality years to your life.'
      },
      {
        title: 'Mind and Body',
        message: 'A healthy body houses a healthy mind. Nurture both!'
      },
      {
        title: 'The Power of Habits',
        message: 'Your habits today shape your health tomorrow. Choose wisely!'
      }
    ];

    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    return this.createNotification(
      userId,
      NotificationType.MOTIVATION,
      randomMessage.title,
      randomMessage.message
    );
  }

  /**
   * Create achievement notification
   */
  static createAchievementNotification(
    userId: string,
    achievementName: string,
    achievementDescription: string
  ): Notification {
    return this.createNotification(
      userId,
      NotificationType.ACHIEVEMENT_UNLOCKED,
      `Achievement Unlocked: ${achievementName}`,
      achievementDescription,
      '/profile/achievements'
    );
  }

  /**
   * Create level up notification
   */
  static createLevelUpNotification(userId: string, newLevel: string): Notification {
    return this.createNotification(
      userId,
      NotificationType.LEVEL_UP,
      `Level Up! You're now ${newLevel}`,
      `Congratulations! You've reached ${newLevel} level. New rewards and features await!`,
      '/rewards'
    );
  }

  /**
   * Get user's notifications
   */
  static getNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    let userNotifications = this.notifications.filter(n => n.user_id === userId);

    if (unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read);
    }

    return userNotifications.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  /**
   * Mark notification as read
   */
  static markAsRead(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  static markAllAsRead(userId: string): number {
    let count = 0;
    for (const notification of this.notifications) {
      if (notification.user_id === userId && !notification.read) {
        notification.read = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Create a notification
   */
  private static createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string
  ): Notification {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type,
      title,
      message,
      action_url: actionUrl,
      created_at: new Date(),
      read: false
    };

    this.notifications.push(notification);
    return notification;
  }

  /**
   * Clear old notifications
   */
  static clearOldNotifications(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const initialCount = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.created_at > cutoffDate);

    return initialCount - this.notifications.length;
  }
}

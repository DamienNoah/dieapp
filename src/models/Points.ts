import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/Database';
import { IPoints, IPointsTransaction, IReward, IUserReward, UserLevel, RewardType } from './types';

// Level thresholds
export const LEVEL_THRESHOLDS: Record<UserLevel, number> = {
  [UserLevel.NOVICE]: 0,
  [UserLevel.BEGINNER]: 500,
  [UserLevel.INTERMEDIATE]: 2000,
  [UserLevel.ADVANCED]: 5000,
  [UserLevel.EXPERT]: 10000,
  [UserLevel.MASTER]: 25000,
  [UserLevel.LONGEVITY_CHAMPION]: 50000
};

// Default rewards catalog
export const DEFAULT_REWARDS: Partial<IReward>[] = [
  {
    reward_id: 'advanced_analytics',
    name: 'Advanced Analytics Access',
    description: 'Unlock detailed biomarker trend analysis and correlations',
    type: RewardType.FEATURE_ACCESS,
    cost: 500,
    available: true,
    required_level: UserLevel.BEGINNER
  },
  {
    reward_id: 'ai_coaching_basic',
    name: 'AI Health Coaching (Basic)',
    description: '1 month of personalized AI health recommendations',
    type: RewardType.AI_COACHING,
    cost: 1000,
    available: true,
    required_level: UserLevel.INTERMEDIATE
  },
  {
    reward_id: 'ai_coaching_premium',
    name: 'AI Health Coaching (Premium)',
    description: '3 months of advanced AI coaching with detailed action plans',
    type: RewardType.AI_COACHING,
    cost: 2500,
    available: true,
    required_level: UserLevel.ADVANCED
  },
  {
    reward_id: 'genetic_insights',
    name: 'Genetic Risk Insights',
    description: 'Unlock genetic predisposition analysis integration',
    type: RewardType.INSIGHT_UNLOCK,
    cost: 3000,
    available: true,
    required_level: UserLevel.ADVANCED
  },
  {
    reward_id: 'longevity_report',
    name: 'Comprehensive Longevity Report',
    description: 'Detailed PDF report with all your health data and recommendations',
    type: RewardType.INSIGHT_UNLOCK,
    cost: 750,
    available: true,
    required_level: UserLevel.BEGINNER
  },
  {
    reward_id: 'badge_early_adopter',
    name: 'Early Adopter Badge',
    description: 'Show off your commitment to longevity',
    type: RewardType.BADGE,
    cost: 100,
    available: true
  },
  {
    reward_id: 'badge_streak_master',
    name: 'Streak Master Badge',
    description: 'Earned for maintaining a 30-day streak',
    type: RewardType.BADGE,
    cost: 300,
    available: true
  },
  {
    reward_id: 'title_biohacker',
    name: 'Biohacker Title',
    description: 'Display "Biohacker" title on your profile',
    type: RewardType.TITLE,
    cost: 500,
    available: true,
    required_level: UserLevel.INTERMEDIATE
  },
  {
    reward_id: 'title_centenarian_candidate',
    name: 'Centenarian Candidate Title',
    description: 'Display "Centenarian Candidate" title on your profile',
    type: RewardType.TITLE,
    cost: 5000,
    available: true,
    required_level: UserLevel.EXPERT
  },
  {
    reward_id: 'avatar_health_warrior',
    name: 'Health Warrior Avatar',
    description: 'Exclusive health warrior avatar frame',
    type: RewardType.AVATAR_UPGRADE,
    cost: 200,
    available: true
  },
  {
    reward_id: 'avatar_longevity_legend',
    name: 'Longevity Legend Avatar',
    description: 'Premium legendary avatar frame',
    type: RewardType.AVATAR_UPGRADE,
    cost: 2000,
    available: true,
    required_level: UserLevel.MASTER
  }
];

export class Points implements IPoints {
  user_id: string;
  current_points: number;
  lifetime_points: number;
  level: UserLevel;
  level_progress: number;
  last_updated: Date;

  constructor(data: Partial<IPoints>) {
    this.user_id = data.user_id || '';
    this.current_points = data.current_points || 0;
    this.lifetime_points = data.lifetime_points || 0;
    this.level = data.level || UserLevel.NOVICE;
    this.level_progress = data.level_progress || 0;
    this.last_updated = data.last_updated || new Date();
  }

  // Calculate level from lifetime points
  calculateLevel(): UserLevel {
    const levels = Object.entries(LEVEL_THRESHOLDS).sort((a, b) => b[1] - a[1]);

    for (const [level, threshold] of levels) {
      if (this.lifetime_points >= threshold) {
        return level as UserLevel;
      }
    }

    return UserLevel.NOVICE;
  }

  // Calculate progress to next level
  calculateLevelProgress(): number {
    const currentThreshold = LEVEL_THRESHOLDS[this.level];
    const levels = Object.entries(LEVEL_THRESHOLDS).sort((a, b) => a[1] - b[1]);
    const currentIndex = levels.findIndex(([level]) => level === this.level);

    if (currentIndex === levels.length - 1) {
      return 100; // Already at max level
    }

    const nextThreshold = levels[currentIndex + 1][1];
    const progress = ((this.lifetime_points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  // Get points needed for next level
  getPointsToNextLevel(): number {
    const levels = Object.entries(LEVEL_THRESHOLDS).sort((a, b) => a[1] - b[1]);
    const currentIndex = levels.findIndex(([level]) => level === this.level);

    if (currentIndex === levels.length - 1) {
      return 0; // Already at max level
    }

    const nextThreshold = levels[currentIndex + 1][1];
    return nextThreshold - this.lifetime_points;
  }

  // Add points
  async addPoints(amount: number, reason: string, source: string): Promise<PointsTransaction> {
    this.current_points += amount;
    this.lifetime_points += amount;
    this.level = this.calculateLevel();
    this.level_progress = this.calculateLevelProgress();
    this.last_updated = new Date();

    await this.save();

    const transaction = new PointsTransaction({
      user_id: this.user_id,
      amount,
      reason,
      source
    });
    await transaction.save();

    return transaction;
  }

  // Subtract points
  async subtractPoints(amount: number, reason: string): Promise<PointsTransaction | null> {
    if (this.current_points < amount) {
      return null; // Not enough points
    }

    this.current_points -= amount;
    this.last_updated = new Date();

    await this.save();

    const transaction = new PointsTransaction({
      user_id: this.user_id,
      amount: -amount,
      reason,
      source: 'redemption'
    });
    await transaction.save();

    return transaction;
  }

  // Save to database
  async save(): Promise<Points> {
    const db = Database.getInstance();

    db.run(`
      INSERT OR REPLACE INTO points (
        user_id, current_points, lifetime_points,
        level, level_progress, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      this.user_id,
      this.current_points,
      this.lifetime_points,
      this.level,
      this.level_progress,
      this.last_updated.toISOString()
    ]);

    return this;
  }

  // Find by user ID
  static findByUserId(userId: string): Points | null {
    const db = Database.getInstance();
    const row = db.get<any>('SELECT * FROM points WHERE user_id = ?', [userId]);

    if (!row) return null;
    return Points.fromRow(row);
  }

  // Create or get points for user
  static async getOrCreate(userId: string): Promise<Points> {
    let points = Points.findByUserId(userId);

    if (!points) {
      points = new Points({ user_id: userId });
      await points.save();
    }

    return points;
  }

  // Convert database row to Points
  private static fromRow(row: any): Points {
    return new Points({
      user_id: row.user_id,
      current_points: row.current_points,
      lifetime_points: row.lifetime_points,
      level: row.level as UserLevel,
      level_progress: row.level_progress,
      last_updated: new Date(row.last_updated)
    });
  }

  // Convert to JSON
  toJSON(): IPoints {
    return {
      user_id: this.user_id,
      current_points: this.current_points,
      lifetime_points: this.lifetime_points,
      level: this.level,
      level_progress: this.level_progress,
      last_updated: this.last_updated
    };
  }
}

export class PointsTransaction implements IPointsTransaction {
  transaction_id: string;
  user_id: string;
  amount: number;
  reason: string;
  source: string;
  created_at: Date;

  constructor(data: Partial<IPointsTransaction>) {
    this.transaction_id = data.transaction_id || uuidv4();
    this.user_id = data.user_id || '';
    this.amount = data.amount || 0;
    this.reason = data.reason || '';
    this.source = data.source || '';
    this.created_at = data.created_at || new Date();
  }

  // Save to database
  async save(): Promise<PointsTransaction> {
    const db = Database.getInstance();

    db.run(`
      INSERT INTO points_transactions (
        transaction_id, user_id, amount, reason, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      this.transaction_id,
      this.user_id,
      this.amount,
      this.reason,
      this.source,
      this.created_at.toISOString()
    ]);

    return this;
  }

  // Find transactions by user ID
  static findByUserId(userId: string, limit: number = 100): PointsTransaction[] {
    const db = Database.getInstance();
    const rows = db.all<any>(
      'SELECT * FROM points_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );

    return rows.map(row => PointsTransaction.fromRow(row));
  }

  // Convert database row to PointsTransaction
  private static fromRow(row: any): PointsTransaction {
    return new PointsTransaction({
      transaction_id: row.transaction_id,
      user_id: row.user_id,
      amount: row.amount,
      reason: row.reason,
      source: row.source,
      created_at: new Date(row.created_at)
    });
  }

  // Convert to JSON
  toJSON(): IPointsTransaction {
    return {
      transaction_id: this.transaction_id,
      user_id: this.user_id,
      amount: this.amount,
      reason: this.reason,
      source: this.source,
      created_at: this.created_at
    };
  }
}

export class Reward implements IReward {
  reward_id: string;
  name: string;
  description: string;
  type: RewardType;
  cost: number;
  available: boolean;
  required_level?: UserLevel;
  image_url?: string;

  constructor(data: Partial<IReward>) {
    this.reward_id = data.reward_id || uuidv4();
    this.name = data.name || '';
    this.description = data.description || '';
    this.type = data.type || RewardType.BADGE;
    this.cost = data.cost || 0;
    this.available = data.available ?? true;
    this.required_level = data.required_level;
    this.image_url = data.image_url;
  }

  // Save to database
  async save(): Promise<Reward> {
    const db = Database.getInstance();

    db.run(`
      INSERT OR REPLACE INTO rewards (
        reward_id, name, description, type, cost,
        available, required_level, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.reward_id,
      this.name,
      this.description,
      this.type,
      this.cost,
      this.available ? 1 : 0,
      this.required_level || null,
      this.image_url || null
    ]);

    return this;
  }

  // Find by ID
  static findById(rewardId: string): Reward | null {
    const db = Database.getInstance();
    const row = db.get<any>('SELECT * FROM rewards WHERE reward_id = ?', [rewardId]);

    if (!row) return null;
    return Reward.fromRow(row);
  }

  // Find all available rewards
  static findAllAvailable(): Reward[] {
    const db = Database.getInstance();
    const rows = db.all<any>('SELECT * FROM rewards WHERE available = 1 ORDER BY cost ASC');

    return rows.map(row => Reward.fromRow(row));
  }

  // Find rewards by type
  static findByType(type: RewardType): Reward[] {
    const db = Database.getInstance();
    const rows = db.all<any>(
      'SELECT * FROM rewards WHERE type = ? AND available = 1 ORDER BY cost ASC',
      [type]
    );

    return rows.map(row => Reward.fromRow(row));
  }

  // Check if user can redeem this reward
  canRedeem(userPoints: Points): { canRedeem: boolean; reason?: string } {
    if (!this.available) {
      return { canRedeem: false, reason: 'Reward is not available' };
    }

    if (userPoints.current_points < this.cost) {
      return { canRedeem: false, reason: 'Not enough points' };
    }

    if (this.required_level) {
      const levelOrder = Object.values(UserLevel);
      const userLevelIndex = levelOrder.indexOf(userPoints.level);
      const requiredLevelIndex = levelOrder.indexOf(this.required_level);

      if (userLevelIndex < requiredLevelIndex) {
        return { canRedeem: false, reason: `Requires ${this.required_level} level` };
      }
    }

    return { canRedeem: true };
  }

  // Initialize default rewards
  static async initializeDefaultRewards(): Promise<void> {
    for (const rewardData of DEFAULT_REWARDS) {
      const reward = new Reward(rewardData);
      await reward.save();
    }
  }

  // Convert database row to Reward
  private static fromRow(row: any): Reward {
    return new Reward({
      reward_id: row.reward_id,
      name: row.name,
      description: row.description,
      type: row.type as RewardType,
      cost: row.cost,
      available: Boolean(row.available),
      required_level: row.required_level as UserLevel | undefined,
      image_url: row.image_url
    });
  }

  // Convert to JSON
  toJSON(): IReward {
    return {
      reward_id: this.reward_id,
      name: this.name,
      description: this.description,
      type: this.type,
      cost: this.cost,
      available: this.available,
      required_level: this.required_level,
      image_url: this.image_url
    };
  }
}

export class UserReward implements IUserReward {
  user_reward_id: string;
  user_id: string;
  reward_id: string;
  redeemed_at: Date;
  expires_at?: Date;

  constructor(data: Partial<IUserReward>) {
    this.user_reward_id = data.user_reward_id || uuidv4();
    this.user_id = data.user_id || '';
    this.reward_id = data.reward_id || '';
    this.redeemed_at = data.redeemed_at || new Date();
    this.expires_at = data.expires_at;
  }

  // Save to database
  async save(): Promise<UserReward> {
    const db = Database.getInstance();

    db.run(`
      INSERT INTO user_rewards (
        user_reward_id, user_id, reward_id, redeemed_at, expires_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      this.user_reward_id,
      this.user_id,
      this.reward_id,
      this.redeemed_at.toISOString(),
      this.expires_at?.toISOString() || null
    ]);

    return this;
  }

  // Find user's rewards
  static findByUserId(userId: string): UserReward[] {
    const db = Database.getInstance();
    const rows = db.all<any>(
      'SELECT * FROM user_rewards WHERE user_id = ? ORDER BY redeemed_at DESC',
      [userId]
    );

    return rows.map(row => UserReward.fromRow(row));
  }

  // Check if user has reward
  static hasReward(userId: string, rewardId: string): boolean {
    const db = Database.getInstance();
    const row = db.get<any>(
      'SELECT * FROM user_rewards WHERE user_id = ? AND reward_id = ?',
      [userId, rewardId]
    );

    if (!row) return false;

    // Check if expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return false;
    }

    return true;
  }

  // Convert database row to UserReward
  private static fromRow(row: any): UserReward {
    return new UserReward({
      user_reward_id: row.user_reward_id,
      user_id: row.user_id,
      reward_id: row.reward_id,
      redeemed_at: new Date(row.redeemed_at),
      expires_at: row.expires_at ? new Date(row.expires_at) : undefined
    });
  }

  // Convert to JSON
  toJSON(): IUserReward {
    return {
      user_reward_id: this.user_reward_id,
      user_id: this.user_id,
      reward_id: this.reward_id,
      redeemed_at: this.redeemed_at,
      expires_at: this.expires_at
    };
  }
}

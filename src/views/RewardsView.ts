import { Points, Reward, UserReward, LEVEL_THRESHOLDS } from '../models/Points';
import { RewardType, UserLevel } from '../models/types';

/**
 * Interfaces for rewards views
 */
export interface RewardCard {
  reward_id: string;
  name: string;
  description: string;
  type: RewardType;
  type_display: string;
  cost: number;
  can_afford: boolean;
  can_redeem: boolean;
  redeem_reason: string | null;
  owned: boolean;
  required_level: UserLevel | undefined;
  icon: string;
}

export interface LevelProgress {
  current_level: UserLevel;
  level_display: string;
  current_points: number;
  lifetime_points: number;
  next_level: UserLevel | null;
  points_to_next_level: number;
  progress_percentage: number;
  benefits: string[];
  next_level_benefits: string[];
}

export interface RewardCategory {
  type: RewardType;
  type_display: string;
  icon: string;
  rewards: RewardCard[];
  total_available: number;
  total_owned: number;
}

/**
 * Rewards View - Formats rewards and points data for UI
 */
export class RewardsView {
  /**
   * Get all reward cards for the rewards store
   */
  static async getRewardCards(userId: string): Promise<RewardCard[]> {
    const points = await Points.getOrCreate(userId);
    const rewards = Reward.findAllAvailable();

    return rewards.map(reward => this.formatRewardCard(reward, points, userId));
  }

  /**
   * Format a single reward as a card
   */
  private static formatRewardCard(reward: Reward, points: Points, userId: string): RewardCard {
    const { canRedeem, reason } = reward.canRedeem(points);
    const owned = UserReward.hasReward(userId, reward.reward_id);

    return {
      reward_id: reward.reward_id,
      name: reward.name,
      description: reward.description,
      type: reward.type,
      type_display: this.formatRewardType(reward.type),
      cost: reward.cost,
      can_afford: points.current_points >= reward.cost,
      can_redeem: canRedeem && !owned,
      redeem_reason: owned ? 'Already owned' : reason || null,
      owned,
      required_level: reward.required_level,
      icon: this.getRewardIcon(reward.type)
    };
  }

  /**
   * Get rewards grouped by category
   */
  static async getRewardsByCategory(userId: string): Promise<RewardCategory[]> {
    const points = await Points.getOrCreate(userId);
    const rewards = Reward.findAllAvailable();
    const categories = new Map<RewardType, Reward[]>();

    // Group by type
    for (const reward of rewards) {
      const existing = categories.get(reward.type) || [];
      existing.push(reward);
      categories.set(reward.type, existing);
    }

    // Format each category
    const result: RewardCategory[] = [];
    for (const [type, categoryRewards] of categories) {
      const cards = categoryRewards.map(r => this.formatRewardCard(r, points, userId));
      const owned = cards.filter(c => c.owned).length;

      result.push({
        type,
        type_display: this.formatRewardType(type),
        icon: this.getRewardIcon(type),
        rewards: cards,
        total_available: cards.length,
        total_owned: owned
      });
    }

    return result;
  }

  /**
   * Get level progress information
   */
  static async getLevelProgress(userId: string): Promise<LevelProgress> {
    const points = await Points.getOrCreate(userId);

    // Get level info
    const levels = Object.entries(LEVEL_THRESHOLDS).sort((a, b) => a[1] - b[1]);
    const currentIndex = levels.findIndex(([level]) => level === points.level);
    const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1][0] as UserLevel : null;
    const pointsToNext = points.getPointsToNextLevel();

    return {
      current_level: points.level,
      level_display: this.formatLevelName(points.level),
      current_points: points.current_points,
      lifetime_points: points.lifetime_points,
      next_level: nextLevel,
      points_to_next_level: pointsToNext,
      progress_percentage: points.level_progress,
      benefits: this.getLevelBenefits(points.level),
      next_level_benefits: nextLevel ? this.getLevelBenefits(nextLevel) : []
    };
  }

  /**
   * Get user's owned rewards
   */
  static async getOwnedRewards(userId: string): Promise<{
    reward: RewardCard;
    redeemed_at: Date;
    expires_at: Date | undefined;
  }[]> {
    const points = await Points.getOrCreate(userId);
    const userRewards = UserReward.findByUserId(userId);

    return userRewards.map(ur => {
      const reward = Reward.findById(ur.reward_id);
      return {
        reward: reward ? this.formatRewardCard(reward, points, userId) : this.getUnknownRewardCard(ur.reward_id),
        redeemed_at: ur.redeemed_at,
        expires_at: ur.expires_at
      };
    });
  }

  /**
   * Get all levels with their requirements
   */
  static getAllLevels(): {
    level: UserLevel;
    display_name: string;
    threshold: number;
    benefits: string[];
    badge_icon: string;
  }[] {
    const levels = Object.entries(LEVEL_THRESHOLDS).sort((a, b) => a[1] - b[1]);

    return levels.map(([level, threshold]) => ({
      level: level as UserLevel,
      display_name: this.formatLevelName(level as UserLevel),
      threshold,
      benefits: this.getLevelBenefits(level as UserLevel),
      badge_icon: this.getLevelBadge(level as UserLevel)
    }));
  }

  /**
   * Get rewards summary for dashboard
   */
  static async getRewardsSummary(userId: string): Promise<{
    available_rewards: number;
    owned_rewards: number;
    affordable_rewards: number;
    total_points: number;
    level: UserLevel;
    level_display: string;
  }> {
    const points = await Points.getOrCreate(userId);
    const rewards = Reward.findAllAvailable();
    const userRewards = UserReward.findByUserId(userId);

    const affordable = rewards.filter(r => {
      const { canRedeem } = r.canRedeem(points);
      return canRedeem && !UserReward.hasReward(userId, r.reward_id);
    }).length;

    return {
      available_rewards: rewards.length,
      owned_rewards: userRewards.length,
      affordable_rewards: affordable,
      total_points: points.current_points,
      level: points.level,
      level_display: this.formatLevelName(points.level)
    };
  }

  /**
   * Format reward type for display
   */
  private static formatRewardType(type: RewardType): string {
    const typeNames: Record<RewardType, string> = {
      [RewardType.INSIGHT_UNLOCK]: 'Insights',
      [RewardType.AI_COACHING]: 'AI Coaching',
      [RewardType.AVATAR_UPGRADE]: 'Avatars',
      [RewardType.FEATURE_ACCESS]: 'Features',
      [RewardType.BADGE]: 'Badges',
      [RewardType.TITLE]: 'Titles'
    };
    return typeNames[type] || type;
  }

  /**
   * Get icon for reward type
   */
  private static getRewardIcon(type: RewardType): string {
    const icons: Record<RewardType, string> = {
      [RewardType.INSIGHT_UNLOCK]: '🔮',
      [RewardType.AI_COACHING]: '🤖',
      [RewardType.AVATAR_UPGRADE]: '👤',
      [RewardType.FEATURE_ACCESS]: '🔓',
      [RewardType.BADGE]: '🏅',
      [RewardType.TITLE]: '👑'
    };
    return icons[type] || '🎁';
  }

  /**
   * Format level name for display
   */
  private static formatLevelName(level: UserLevel): string {
    const names: Record<UserLevel, string> = {
      [UserLevel.NOVICE]: 'Novice',
      [UserLevel.BEGINNER]: 'Beginner',
      [UserLevel.INTERMEDIATE]: 'Intermediate',
      [UserLevel.ADVANCED]: 'Advanced',
      [UserLevel.EXPERT]: 'Expert',
      [UserLevel.MASTER]: 'Master',
      [UserLevel.LONGEVITY_CHAMPION]: 'Longevity Champion'
    };
    return names[level] || level;
  }

  /**
   * Get level badge icon
   */
  private static getLevelBadge(level: UserLevel): string {
    const badges: Record<UserLevel, string> = {
      [UserLevel.NOVICE]: '🌱',
      [UserLevel.BEGINNER]: '🌿',
      [UserLevel.INTERMEDIATE]: '🌲',
      [UserLevel.ADVANCED]: '⭐',
      [UserLevel.EXPERT]: '🌟',
      [UserLevel.MASTER]: '💫',
      [UserLevel.LONGEVITY_CHAMPION]: '👑'
    };
    return badges[level] || '🏅';
  }

  /**
   * Get benefits for a level
   */
  private static getLevelBenefits(level: UserLevel): string[] {
    const benefits: Record<UserLevel, string[]> = {
      [UserLevel.NOVICE]: ['Basic habit tracking', 'Daily progress view'],
      [UserLevel.BEGINNER]: ['Basic analytics', 'Streak bonuses', 'Weekly reports'],
      [UserLevel.INTERMEDIATE]: ['Advanced insights', 'AI coaching access', 'Biomarker correlations'],
      [UserLevel.ADVANCED]: ['Predictive modeling', 'Personalized programs', 'Priority support'],
      [UserLevel.EXPERT]: ['Full analytics suite', 'Custom health programs', 'Community features'],
      [UserLevel.MASTER]: ['Early feature access', 'Research participation', 'VIP support'],
      [UserLevel.LONGEVITY_CHAMPION]: ['All features unlocked', 'Exclusive content', 'Expert consultations']
    };
    return benefits[level] || [];
  }

  /**
   * Get placeholder for unknown reward
   */
  private static getUnknownRewardCard(rewardId: string): RewardCard {
    return {
      reward_id: rewardId,
      name: 'Unknown Reward',
      description: 'This reward is no longer available',
      type: RewardType.BADGE,
      type_display: 'Unknown',
      cost: 0,
      can_afford: false,
      can_redeem: false,
      redeem_reason: 'Reward no longer available',
      owned: true,
      required_level: undefined,
      icon: '❓'
    };
  }
}

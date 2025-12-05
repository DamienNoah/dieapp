import { Request, Response } from 'express';
import { Points, PointsTransaction, Reward, UserReward, LEVEL_THRESHOLDS } from '../models/Points';
import { UserProfile } from '../models/UserProfile';
import { IApiResponse, IPoints, IPointsTransaction, IReward, IUserReward, UserLevel } from '../models/types';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  lifetime_points: number;
  level: UserLevel;
  rank: number;
}

export class PointsController {
  // Get user's points
  static async getPoints(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const points = await Points.getOrCreate(userId);

      const response: IApiResponse<IPoints> = {
        success: true,
        data: points.toJSON()
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch points'
      };
      res.status(500).json(response);
    }
  }

  // Get detailed points info with next level
  static async getDetailedPoints(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const points = await Points.getOrCreate(userId);
      const pointsToNextLevel = points.getPointsToNextLevel();

      const levels = Object.entries(LEVEL_THRESHOLDS).sort((a, b) => a[1] - b[1]);
      const currentLevelIndex = levels.findIndex(([level]) => level === points.level);
      const nextLevel = currentLevelIndex < levels.length - 1 ? levels[currentLevelIndex + 1][0] : null;

      const detailedInfo = {
        ...points.toJSON(),
        points_to_next_level: pointsToNextLevel,
        next_level: nextLevel,
        all_levels: LEVEL_THRESHOLDS
      };

      const response: IApiResponse<typeof detailedInfo> = {
        success: true,
        data: detailedInfo
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch detailed points'
      };
      res.status(500).json(response);
    }
  }

  // Get points transaction history
  static async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const transactions = PointsTransaction.findByUserId(userId, limit);

      const response: IApiResponse<IPointsTransaction[]> = {
        success: true,
        data: transactions.map(t => t.toJSON())
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transaction history'
      };
      res.status(500).json(response);
    }
  }

  // Add points (admin or special events)
  static async addPoints(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { amount, reason, source } = req.body;

      if (!amount || amount <= 0) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Amount must be a positive number'
        };
        res.status(400).json(response);
        return;
      }

      const points = await Points.getOrCreate(userId);
      const previousLevel = points.level;

      const transaction = await points.addPoints(amount, reason || 'Manual addition', source || 'admin');

      // Check for level up
      let levelUpMessage = '';
      if (points.level !== previousLevel) {
        levelUpMessage = ` Congratulations! You leveled up to ${points.level}!`;
      }

      const response: IApiResponse<{ points: IPoints; transaction: IPointsTransaction }> = {
        success: true,
        data: {
          points: points.toJSON(),
          transaction: transaction.toJSON()
        },
        message: `Added ${amount} points.${levelUpMessage}`
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add points'
      };
      res.status(500).json(response);
    }
  }

  // Get all available rewards
  static async getRewards(req: Request, res: Response): Promise<void> {
    try {
      const rewards = Reward.findAllAvailable();

      const response: IApiResponse<IReward[]> = {
        success: true,
        data: rewards.map(r => r.toJSON())
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rewards'
      };
      res.status(500).json(response);
    }
  }

  // Get rewards available to user (based on level and points)
  static async getAvailableRewards(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const points = await Points.getOrCreate(userId);
      const allRewards = Reward.findAllAvailable();

      const availableRewards = allRewards.map(reward => {
        const { canRedeem, reason } = reward.canRedeem(points);
        return {
          ...reward.toJSON(),
          can_redeem: canRedeem,
          reason: reason || null
        };
      });

      const response: IApiResponse<typeof availableRewards> = {
        success: true,
        data: availableRewards
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch available rewards'
      };
      res.status(500).json(response);
    }
  }

  // Redeem a reward
  static async redeemReward(req: Request, res: Response): Promise<void> {
    try {
      const { userId, rewardId } = req.params;

      const points = await Points.getOrCreate(userId);
      const reward = Reward.findById(rewardId);

      if (!reward) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Reward not found'
        };
        res.status(404).json(response);
        return;
      }

      // Check if already owned (for non-consumable rewards)
      if (UserReward.hasReward(userId, rewardId)) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'You already own this reward'
        };
        res.status(400).json(response);
        return;
      }

      // Check if can redeem
      const { canRedeem, reason } = reward.canRedeem(points);
      if (!canRedeem) {
        const response: IApiResponse<null> = {
          success: false,
          error: reason || 'Cannot redeem this reward'
        };
        res.status(400).json(response);
        return;
      }

      // Deduct points
      const transaction = await points.subtractPoints(reward.cost, `Redeemed: ${reward.name}`);
      if (!transaction) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Failed to deduct points'
        };
        res.status(500).json(response);
        return;
      }

      // Create user reward
      const userReward = new UserReward({
        user_id: userId,
        reward_id: rewardId
      });
      await userReward.save();

      const response: IApiResponse<{ user_reward: IUserReward; points_remaining: number }> = {
        success: true,
        data: {
          user_reward: userReward.toJSON(),
          points_remaining: points.current_points
        },
        message: `Successfully redeemed: ${reward.name}`
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to redeem reward'
      };
      res.status(500).json(response);
    }
  }

  // Get user's redeemed rewards
  static async getUserRewards(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const userRewards = UserReward.findByUserId(userId);

      // Get full reward details for each
      const rewardsWithDetails = userRewards.map(ur => {
        const reward = Reward.findById(ur.reward_id);
        return {
          ...ur.toJSON(),
          reward_details: reward?.toJSON() || null
        };
      });

      const response: IApiResponse<typeof rewardsWithDetails> = {
        success: true,
        data: rewardsWithDetails
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user rewards'
      };
      res.status(500).json(response);
    }
  }

  // Get leaderboard
  static async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const allUsers = UserProfile.findAll();
      const leaderboard: LeaderboardEntry[] = [];

      for (const user of allUsers) {
        const points = Points.findByUserId(user.user_id);
        if (points) {
          leaderboard.push({
            user_id: user.user_id,
            username: user.username,
            lifetime_points: points.lifetime_points,
            level: points.level,
            rank: 0 // Will be assigned after sorting
          });
        }
      }

      // Sort by lifetime points
      leaderboard.sort((a, b) => b.lifetime_points - a.lifetime_points);

      // Assign ranks
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      const response: IApiResponse<LeaderboardEntry[]> = {
        success: true,
        data: leaderboard.slice(0, limit)
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch leaderboard'
      };
      res.status(500).json(response);
    }
  }

  // Get user's rank
  static async getUserRank(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const userPoints = Points.findByUserId(userId);
      if (!userPoints) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      const allUsers = UserProfile.findAll();
      let rank = 1;

      for (const user of allUsers) {
        if (user.user_id !== userId) {
          const points = Points.findByUserId(user.user_id);
          if (points && points.lifetime_points > userPoints.lifetime_points) {
            rank++;
          }
        }
      }

      const response: IApiResponse<{ rank: number; total_users: number; points: IPoints }> = {
        success: true,
        data: {
          rank,
          total_users: allUsers.length,
          points: userPoints.toJSON()
        }
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user rank'
      };
      res.status(500).json(response);
    }
  }

  // Get level info
  static async getLevelInfo(req: Request, res: Response): Promise<void> {
    try {
      const levels = Object.entries(LEVEL_THRESHOLDS).map(([level, threshold]) => ({
        level,
        threshold,
        benefits: getLevelBenefits(level as UserLevel)
      }));

      const response: IApiResponse<typeof levels> = {
        success: true,
        data: levels
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch level info'
      };
      res.status(500).json(response);
    }
  }
}

// Helper function to get level benefits
function getLevelBenefits(level: UserLevel): string[] {
  const benefits: Record<UserLevel, string[]> = {
    [UserLevel.NOVICE]: ['Access to basic features', 'Daily habit tracking'],
    [UserLevel.BEGINNER]: ['Basic analytics unlocked', 'Streak bonuses available'],
    [UserLevel.INTERMEDIATE]: ['Advanced biomarker insights', 'Weekly reports', 'AI coaching access'],
    [UserLevel.ADVANCED]: ['Predictive health modeling', 'Personalized recommendations', 'Priority support'],
    [UserLevel.EXPERT]: ['Full analytics suite', 'Custom health programs', 'Community features'],
    [UserLevel.MASTER]: ['Early access to features', 'Research participation', 'VIP support'],
    [UserLevel.LONGEVITY_CHAMPION]: ['All features unlocked', 'Exclusive content', 'Founding member status', 'Direct access to health experts']
  };

  return benefits[level] || [];
}

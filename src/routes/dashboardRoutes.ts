import { Router, Request, Response } from 'express';
import { DashboardView } from '../views/DashboardView';
import { BiomarkerView } from '../views/BiomarkerView';
import { HabitView } from '../views/HabitView';
import { RewardsView } from '../views/RewardsView';
import { ProfileView } from '../views/ProfileView';
import { IApiResponse } from '../models/types';

const router = Router();

// Main dashboard data
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const data = await DashboardView.getDashboardData(userId);

    if (!data) {
      const response: IApiResponse<null> = {
        success: false,
        error: 'User not found'
      };
      res.status(404).json(response);
      return;
    }

    const response: IApiResponse<typeof data> = {
      success: true,
      data
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load dashboard'
    };
    res.status(500).json(response);
  }
});

// Quick stats for header
router.get('/:userId/quick-stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const stats = await DashboardView.getQuickStats(userId);

    const response: IApiResponse<typeof stats> = {
      success: true,
      data: stats
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load quick stats'
    };
    res.status(500).json(response);
  }
});

// Biomarker view data
router.get('/:userId/biomarkers/cards', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const cards = BiomarkerView.getBiomarkerCards(userId);

    const response: IApiResponse<typeof cards> = {
      success: true,
      data: cards
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load biomarker cards'
    };
    res.status(500).json(response);
  }
});

router.get('/:userId/biomarkers/categories', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const categories = BiomarkerView.getBiomarkersByCategory(userId);

    const response: IApiResponse<typeof categories> = {
      success: true,
      data: categories
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load biomarker categories'
    };
    res.status(500).json(response);
  }
});

router.get('/:userId/biomarkers/trend/:biomarkerName', async (req: Request, res: Response) => {
  try {
    const { userId, biomarkerName } = req.params;
    const days = parseInt(req.query.days as string) || 90;
    const trend = BiomarkerView.getBiomarkerTrend(userId, biomarkerName, days);

    if (!trend) {
      const response: IApiResponse<null> = {
        success: false,
        error: 'No trend data found'
      };
      res.status(404).json(response);
      return;
    }

    const response: IApiResponse<typeof trend> = {
      success: true,
      data: trend
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load trend data'
    };
    res.status(500).json(response);
  }
});

// Habit view data
router.get('/:userId/habits/cards', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const cards = HabitView.getHabitCards(userId);

    const response: IApiResponse<typeof cards> = {
      success: true,
      data: cards
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load habit cards'
    };
    res.status(500).json(response);
  }
});

router.get('/:userId/habits/calendar', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth();
    const calendar = HabitView.getCalendarView(userId, year, month);

    const response: IApiResponse<typeof calendar> = {
      success: true,
      data: calendar
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load habit calendar'
    };
    res.status(500).json(response);
  }
});

router.get('/:userId/habits/stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const stats = HabitView.getHabitStats(userId);

    const response: IApiResponse<typeof stats> = {
      success: true,
      data: stats
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load habit stats'
    };
    res.status(500).json(response);
  }
});

router.get('/:userId/habits/progress', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const progress = HabitView.getTodayProgress(userId);

    const response: IApiResponse<typeof progress> = {
      success: true,
      data: progress
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load today\'s progress'
    };
    res.status(500).json(response);
  }
});

// Rewards view data
router.get('/:userId/rewards/store', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const rewards = await RewardsView.getRewardCards(userId);

    const response: IApiResponse<typeof rewards> = {
      success: true,
      data: rewards
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load rewards store'
    };
    res.status(500).json(response);
  }
});

router.get('/:userId/rewards/level', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const progress = await RewardsView.getLevelProgress(userId);

    const response: IApiResponse<typeof progress> = {
      success: true,
      data: progress
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load level progress'
    };
    res.status(500).json(response);
  }
});

// Profile view data
router.get('/:userId/profile/summary', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const summary = await ProfileView.getProfileSummary(userId);

    if (!summary) {
      const response: IApiResponse<null> = {
        success: false,
        error: 'User not found'
      };
      res.status(404).json(response);
      return;
    }

    const response: IApiResponse<typeof summary> = {
      success: true,
      data: summary
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load profile summary'
    };
    res.status(500).json(response);
  }
});

router.get('/:userId/profile/activity', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const activity = ProfileView.getActivityTimeline(userId, limit);

    const response: IApiResponse<typeof activity> = {
      success: true,
      data: activity
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load activity timeline'
    };
    res.status(500).json(response);
  }
});

router.get('/:userId/profile/achievements', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const achievements = ProfileView.getAchievements(userId);

    const response: IApiResponse<typeof achievements> = {
      success: true,
      data: achievements
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load achievements'
    };
    res.status(500).json(response);
  }
});

router.get('/:userId/profile/coaching', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const suggestions = ProfileView.getCoachingSuggestions(userId);

    const response: IApiResponse<typeof suggestions> = {
      success: true,
      data: suggestions
    };
    res.json(response);
  } catch (error) {
    const response: IApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load coaching suggestions'
    };
    res.status(500).json(response);
  }
});

export default router;

import { Router } from 'express';
import { PointsController } from '../controllers/PointsController';

const router = Router();

// Points retrieval
router.get('/:userId', PointsController.getPoints);
router.get('/:userId/detailed', PointsController.getDetailedPoints);
router.get('/:userId/history', PointsController.getTransactionHistory);
router.get('/:userId/rank', PointsController.getUserRank);

// Add points (admin)
router.post('/:userId/add', PointsController.addPoints);

// Rewards
router.get('/rewards/all', PointsController.getRewards);
router.get('/:userId/rewards/available', PointsController.getAvailableRewards);
router.get('/:userId/rewards/owned', PointsController.getUserRewards);
router.post('/:userId/rewards/:rewardId/redeem', PointsController.redeemReward);

// Leaderboard and levels
router.get('/leaderboard/top', PointsController.getLeaderboard);
router.get('/levels/info', PointsController.getLevelInfo);

export default router;

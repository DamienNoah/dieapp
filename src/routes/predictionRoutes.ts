import { Router } from 'express';
import { PredictionController } from '../controllers/PredictionController';

const router = Router();

// Run prediction
router.post('/:userId/calculate', PredictionController.runPrediction);

// Get predictions
router.get('/:userId/latest', PredictionController.getLatestPrediction);
router.get('/:userId/history', PredictionController.getPredictionHistory);
router.get('/:userId/compare', PredictionController.comparePredictions);
router.get('/:userId/trend', PredictionController.getPredictionTrend);

// Detailed analysis
router.get('/:userId/risks', PredictionController.getRiskHotspots);
router.get('/:userId/actions', PredictionController.getRecommendedActions);
router.get('/:userId/biological-age', PredictionController.getBiologicalAgeBreakdown);
router.get('/:userId/insight', PredictionController.getMotivationalInsight);

export default router;

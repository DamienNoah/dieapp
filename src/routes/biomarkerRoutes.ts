import { Router } from 'express';
import { BiomarkerController } from '../controllers/BiomarkerController';

const router = Router();

// Biomarker CRUD
router.post('/:userId', BiomarkerController.addBiomarkerValue);
router.post('/:userId/custom', BiomarkerController.addCustomBiomarker);
router.get('/:userId', BiomarkerController.getLatestBiomarkers);
router.delete('/entry/:biomarkerId', BiomarkerController.deleteBiomarker);

// History and analytics
router.get('/:userId/history/:biomarkerName', BiomarkerController.getBiomarkerHistory);
router.get('/:userId/trend/:biomarkerName', BiomarkerController.getTrendAnalytics);
router.get('/:userId/trends', BiomarkerController.getAllTrends);

// Alerts and definitions
router.get('/:userId/alerts', BiomarkerController.checkRiskAlerts);
router.get('/definitions/all', BiomarkerController.getBiomarkerDefinitions);

export default router;

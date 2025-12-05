import { Router } from 'express';
import profileRoutes from './profileRoutes';
import biomarkerRoutes from './biomarkerRoutes';
import habitRoutes from './habitRoutes';
import pointsRoutes from './pointsRoutes';
import predictionRoutes from './predictionRoutes';
import dashboardRoutes from './dashboardRoutes';

const router = Router();

// Mount all routes
router.use('/profiles', profileRoutes);
router.use('/biomarkers', biomarkerRoutes);
router.use('/habits', habitRoutes);
router.use('/points', pointsRoutes);
router.use('/predictions', predictionRoutes);
router.use('/dashboard', dashboardRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;

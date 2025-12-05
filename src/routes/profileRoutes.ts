import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';

const router = Router();

// Profile CRUD
router.post('/', ProfileController.createProfile);
router.get('/:userId', ProfileController.getProfile);
router.put('/:userId', ProfileController.updateProfile);
router.delete('/:userId', ProfileController.deleteProfile);

// Lifestyle and medical updates
router.put('/:userId/lifestyle', ProfileController.updateLifestyleFactors);
router.put('/:userId/medical-history', ProfileController.updateMedicalHistory);

// Stats and onboarding
router.get('/:userId/stats', ProfileController.getUserStats);
router.post('/:userId/onboarding', ProfileController.completeOnboarding);

export default router;

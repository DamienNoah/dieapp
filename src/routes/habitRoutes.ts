import { Router } from 'express';
import { HabitController } from '../controllers/HabitController';

const router = Router();

// Habit creation
router.post('/:userId/template', HabitController.createFromTemplate);
router.post('/:userId/custom', HabitController.createCustomHabit);

// Habit retrieval
router.get('/:userId', HabitController.getHabits);
router.get('/:userId/today', HabitController.getTodaysHabits);
router.get('/:userId/streaks', HabitController.getStreakInfo);
router.get('/:userId/calendar', HabitController.getCalendarView);

// Templates
router.get('/templates/all', HabitController.getTemplates);

// Habit actions
router.post('/complete/:habitId', HabitController.checkOffHabit);
router.post('/fail/:habitId', HabitController.logFailure);
router.put('/:habitId', HabitController.updateHabit);
router.delete('/:habitId', HabitController.deleteHabit);

// Habit logs
router.get('/logs/:habitId', HabitController.getHabitLogs);

export default router;

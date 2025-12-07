import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { Database } from './database/Database';
import routes from './routes';
import { Reward } from './models/Points';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Initialize database
async function initializeApp() {
  console.log('Initializing Lifespan+ API...');

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory');
  }

  // Initialize database (async for sql.js)
  const db = await Database.ensureInitialized();
  db.initializeSchema();
  console.log('Database schema initialized');

  // Initialize default rewards if not present
  const existingRewards = Reward.findAllAvailable();
  if (existingRewards.length === 0) {
    await Reward.initializeDefaultRewards();
    console.log('Default rewards initialized');
  }

  // Mount routes
  app.use('/api', routes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Lifespan+ API',
      version: '1.0.0',
      description: 'Health and longevity tracking application',
      endpoints: {
        health: '/api/health',
        profiles: '/api/profiles',
        biomarkers: '/api/biomarkers',
        habits: '/api/habits',
        points: '/api/points',
        predictions: '/api/predictions',
        dashboard: '/api/dashboard'
      }
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path
    });
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     🧬 Lifespan+ API v1.0.0                          ║
║     Health & Longevity Tracking                      ║
║                                                       ║
║     Server running on http://localhost:${PORT}         ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

Available endpoints:
  GET  /                         - API info
  GET  /api/health               - Health check

  Profiles:
  POST /api/profiles             - Create profile
  GET  /api/profiles/:userId     - Get profile
  PUT  /api/profiles/:userId     - Update profile

  Biomarkers:
  POST /api/biomarkers/:userId   - Add biomarker
  GET  /api/biomarkers/:userId   - Get latest biomarkers
  GET  /api/biomarkers/:userId/trends - Get all trends

  Habits:
  POST /api/habits/:userId/template - Create from template
  GET  /api/habits/:userId       - Get habits
  POST /api/habits/complete/:id  - Complete habit

  Points & Rewards:
  GET  /api/points/:userId       - Get points
  GET  /api/points/rewards/all   - Get all rewards
  POST /api/points/:userId/rewards/:id/redeem - Redeem

  Predictions:
  POST /api/predictions/:userId/calculate - Run prediction
  GET  /api/predictions/:userId/latest    - Get latest

  Dashboard (View Data):
  GET  /api/dashboard/:userId    - Full dashboard data
`);
  });
}

// Run the application
initializeApp().catch(error => {
  console.error('Failed to initialize application:', error);
  process.exit(1);
});

export default app;

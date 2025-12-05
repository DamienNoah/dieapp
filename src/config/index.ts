// Application configuration
export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    path: process.env.DB_PATH || './data/lifespan.db'
  },

  // Points system
  points: {
    habitCompletion: 10,
    biomarkerLog: 5,
    biomarkerOptimal: 15,
    predictionRun: 10,
    onboardingComplete: 100,
    streakBonuses: {
      7: 50,
      30: 200,
      100: 1000
    }
  },

  // Prediction model weights
  prediction: {
    baseLifeExpectancy: {
      male: 76.1,
      female: 81.1,
      other: 78.6
    },
    maxBiologicalAgeDeviation: 20,
    confidenceBaseUncertainty: 5
  },

  // Notifications
  notifications: {
    habitReminderHours: [8, 18],
    cleanupDays: 30
  }
};

export default config;

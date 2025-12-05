# Lifespan+ - Health & Longevity Tracking Application

A comprehensive health and longevity tracking application built with TypeScript, Express, and SQLite. Track biomarkers, build healthy habits, and receive personalized lifespan predictions.

## Features

### Core Functionality

- **User Profiles**: Manage health data, lifestyle factors, and medical history
- **Biomarker Tracking**: Log and analyze 17+ health biomarkers with trend analysis
- **Habit Management**: Create and track daily habits with streaks and gamification
- **Points & Rewards**: Earn points for healthy behaviors and redeem rewards
- **Lifespan Prediction**: AI-powered biological age and lifespan prediction model

### MVC Architecture

```
src/
├── models/          # Data layer - entities and database operations
├── views/           # View layer - data aggregation for UI
├── controllers/     # Controller layer - business logic
├── services/        # Services - prediction algorithms, integrations
├── routes/          # API route definitions
├── database/        # Database setup and migrations
├── config/          # Configuration
└── utils/           # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Initialize database and seed demo data
npm run migrate
npm run seed

# Start development server
npm run dev

# Or build and start production
npm run build
npm start
```

### API Endpoints

The server runs on `http://localhost:3000` by default.

#### Profiles
- `POST /api/profiles` - Create user profile
- `GET /api/profiles/:userId` - Get profile
- `PUT /api/profiles/:userId` - Update profile

#### Biomarkers
- `POST /api/biomarkers/:userId` - Add biomarker value
- `GET /api/biomarkers/:userId` - Get latest biomarkers
- `GET /api/biomarkers/:userId/trends` - Get all trends
- `GET /api/biomarkers/definitions/all` - Get biomarker definitions

#### Habits
- `POST /api/habits/:userId/template` - Create from template
- `GET /api/habits/:userId` - Get all habits
- `POST /api/habits/complete/:habitId` - Complete habit
- `GET /api/habits/:userId/today` - Get today's habits

#### Points & Rewards
- `GET /api/points/:userId` - Get user points
- `GET /api/points/rewards/all` - Get available rewards
- `POST /api/points/:userId/rewards/:rewardId/redeem` - Redeem reward

#### Predictions
- `POST /api/predictions/:userId/calculate` - Run lifespan prediction
- `GET /api/predictions/:userId/latest` - Get latest prediction
- `GET /api/predictions/:userId/actions` - Get recommended actions

#### Dashboard
- `GET /api/dashboard/:userId` - Get full dashboard data
- `GET /api/dashboard/:userId/quick-stats` - Get quick stats

## Biomarkers Tracked

### Cardiovascular
- LDL Cholesterol
- HDL Cholesterol
- ApoB
- Lp(a)
- Blood Pressure (Systolic)

### Metabolic
- Fasting Glucose
- HbA1c
- Fasting Insulin
- Triglycerides

### Fitness
- VO2 Max
- Heart Rate Variability (HRV)
- Resting Heart Rate

### Inflammation
- hs-CRP
- Homocysteine

### Hormones
- Testosterone
- Vitamin D
- TSH

## Habit Templates

- 8 Hours Sleep
- 30 Minutes Exercise
- 10,000 Steps
- 15 Minutes Meditation
- No Alcohol
- Zone 2 Cardio
- Strength Training
- Hydration
- Cold Exposure
- Sauna
- Intermittent Fasting

## Prediction Model

The lifespan prediction model uses:

1. **Base Life Expectancy**: Age and sex-adjusted baseline
2. **Biomarker Analysis**: Deviation scoring from optimal ranges
3. **Lifestyle Factors**: Activity, diet, sleep, stress adjustments
4. **Habit Impact**: Consistent healthy behaviors add years
5. **Risk Assessment**: Identification of key health risks
6. **Recommended Actions**: Personalized interventions with potential gain

## Gamification System

### Points Earned For:
- Logging biomarkers: 5-15 points
- Completing habits: 10+ points (with streak bonuses)
- Running predictions: 10 points
- Completing onboarding: 100 points

### User Levels:
1. Novice (0 points)
2. Beginner (500 points)
3. Intermediate (2,000 points)
4. Advanced (5,000 points)
5. Expert (10,000 points)
6. Master (25,000 points)
7. Longevity Champion (50,000 points)

### Streak Bonuses:
- 7-day streak: 50 bonus points
- 30-day streak: 200 bonus points
- 100-day streak: 1,000 bonus points

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Architecture**: MVC pattern

## License

MIT

// ============================================
// Lifespan+ Type Definitions
// ============================================

// Enums
export enum Sex {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum ActivityLevel {
  SEDENTARY = 'sedentary',
  LIGHTLY_ACTIVE = 'lightly_active',
  MODERATELY_ACTIVE = 'moderately_active',
  VERY_ACTIVE = 'very_active',
  EXTREMELY_ACTIVE = 'extremely_active'
}

export enum DietType {
  STANDARD = 'standard',
  MEDITERRANEAN = 'mediterranean',
  KETO = 'keto',
  VEGAN = 'vegan',
  VEGETARIAN = 'vegetarian',
  PALEO = 'paleo',
  INTERMITTENT_FASTING = 'intermittent_fasting',
  CARNIVORE = 'carnivore'
}

export enum HabitType {
  SLEEP = 'sleep',
  EXERCISE = 'exercise',
  DIET = 'diet',
  MEDITATION = 'meditation',
  NO_ALCOHOL = 'no_alcohol',
  NO_SMOKING = 'no_smoking',
  HYDRATION = 'hydration',
  SUPPLEMENTS = 'supplements',
  COLD_EXPOSURE = 'cold_exposure',
  SAUNA = 'sauna',
  WALKING = 'walking',
  STRENGTH_TRAINING = 'strength_training',
  ZONE_2_CARDIO = 'zone_2_cardio',
  FASTING = 'fasting'
}

export enum HabitFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export enum RiskLevel {
  OPTIMAL = 'optimal',
  NORMAL = 'normal',
  BORDERLINE = 'borderline',
  HIGH_RISK = 'high_risk',
  CRITICAL = 'critical'
}

export enum RewardType {
  INSIGHT_UNLOCK = 'insight_unlock',
  AI_COACHING = 'ai_coaching',
  AVATAR_UPGRADE = 'avatar_upgrade',
  FEATURE_ACCESS = 'feature_access',
  BADGE = 'badge',
  TITLE = 'title'
}

export enum UserLevel {
  NOVICE = 'novice',
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MASTER = 'master',
  LONGEVITY_CHAMPION = 'longevity_champion'
}

// ============================================
// Core Interfaces
// ============================================

export interface IUserProfile {
  user_id: string;
  username: string;
  email: string;
  age: number;
  sex: Sex;
  ethnicity?: string;
  height_cm: number;
  weight_kg: number;
  body_fat_percentage?: number;
  medical_history?: IMedicalHistory;
  lifestyle_factors: ILifestyleFactors;
  created_at: Date;
  updated_at: Date;
}

export interface IMedicalHistory {
  conditions: string[];
  medications: string[];
  allergies: string[];
  family_history: string[];
  surgeries: string[];
}

export interface ILifestyleFactors {
  sleep_avg_hours: number;
  activity_level: ActivityLevel;
  diet_type: DietType;
  stress_score: number; // 1-10
  smoking_status: boolean;
  alcohol_drinks_per_week: number;
}

export interface IBiomarker {
  biomarker_id: string;
  user_id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  clinical_range_min: number;
  clinical_range_max: number;
  optimal_range_min: number;
  optimal_range_max: number;
  risk_weight: number; // Impact on longevity model (0-1)
  category: string;
}

export interface IBiomarkerDefinition {
  name: string;
  unit: string;
  clinical_range_min: number;
  clinical_range_max: number;
  optimal_range_min: number;
  optimal_range_max: number;
  risk_weight: number;
  category: string;
  description: string;
  improvement_tips: string[];
}

export interface IHabit {
  habit_id: string;
  user_id: string;
  type: HabitType;
  name: string;
  description?: string;
  target_value: number;
  target_unit: string;
  frequency: HabitFrequency;
  current_streak: number;
  longest_streak: number;
  success_rate: number; // Percentage 0-100
  points_per_completion: number;
  streak_bonus_multiplier: number;
  streak_break_penalty: number;
  created_at: Date;
  updated_at: Date;
}

export interface IHabitLog {
  log_id: string;
  habit_id: string;
  user_id: string;
  completed: boolean;
  actual_value?: number;
  notes?: string;
  points_earned: number;
  logged_at: Date;
}

export interface IPoints {
  user_id: string;
  current_points: number;
  lifetime_points: number;
  level: UserLevel;
  level_progress: number; // Percentage to next level
  last_updated: Date;
}

export interface IPointsTransaction {
  transaction_id: string;
  user_id: string;
  amount: number;
  reason: string;
  source: string; // habit completion, streak bonus, biomarker improvement, etc.
  created_at: Date;
}

export interface IReward {
  reward_id: string;
  name: string;
  description: string;
  type: RewardType;
  cost: number;
  available: boolean;
  required_level?: UserLevel;
  image_url?: string;
}

export interface IUserReward {
  user_reward_id: string;
  user_id: string;
  reward_id: string;
  redeemed_at: Date;
  expires_at?: Date;
}

export interface ILifespanPrediction {
  prediction_id: string;
  user_id: string;
  predicted_lifespan_years: number;
  biological_age: number;
  chronological_age: number;
  age_difference: number; // biological - chronological (negative is good)
  confidence_interval_low: number;
  confidence_interval_high: number;
  risk_hotspots: IRiskHotspot[];
  recommended_actions: IRecommendedAction[];
  calculated_at: Date;
}

export interface IRiskHotspot {
  category: string;
  risk_level: RiskLevel;
  description: string;
  impact_years: number; // Potential years lost/gained
  related_biomarkers: string[];
}

export interface IRecommendedAction {
  priority: number;
  action: string;
  category: string;
  potential_gain_years: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
}

// ============================================
// Dashboard View Types
// ============================================

export interface IDashboardData {
  user: IUserProfile;
  lifespan_prediction: ILifespanPrediction;
  todays_habits: ITodaysHabit[];
  biomarker_summary: IBiomarkerSummary[];
  points: IPoints;
  motivational_insight: string;
  recent_achievements: IAchievement[];
}

export interface ITodaysHabit {
  habit: IHabit;
  completed_today: boolean;
  progress_value?: number;
}

export interface IBiomarkerSummary {
  name: string;
  latest_value: number;
  unit: string;
  risk_level: RiskLevel;
  trend: 'improving' | 'stable' | 'declining';
  lifespan_impact_days: number;
}

export interface IAchievement {
  name: string;
  description: string;
  earned_at: Date;
  icon: string;
}

// ============================================
// API Response Types
// ============================================

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

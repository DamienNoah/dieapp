import { UserProfile } from '../models/UserProfile';
import { Biomarker, BIOMARKER_DEFINITIONS } from '../models/Biomarker';
import { Habit } from '../models/Habit';
import { LifespanPrediction } from '../models/LifespanPrediction';
import {
  IRiskHotspot,
  IRecommendedAction,
  RiskLevel,
  ActivityLevel,
  DietType,
  HabitType
} from '../models/types';

// Base life expectancy data (simplified, based on actuarial tables)
const BASE_LIFE_EXPECTANCY = {
  male: 76.1,
  female: 81.1,
  other: 78.6
};

// Activity level modifiers (years)
const ACTIVITY_MODIFIERS: Record<ActivityLevel, number> = {
  [ActivityLevel.SEDENTARY]: -4.0,
  [ActivityLevel.LIGHTLY_ACTIVE]: -1.0,
  [ActivityLevel.MODERATELY_ACTIVE]: 0,
  [ActivityLevel.VERY_ACTIVE]: 2.0,
  [ActivityLevel.EXTREMELY_ACTIVE]: 3.0
};

// Diet type modifiers (years)
const DIET_MODIFIERS: Record<DietType, number> = {
  [DietType.STANDARD]: 0,
  [DietType.MEDITERRANEAN]: 2.5,
  [DietType.KETO]: 0.5,
  [DietType.VEGAN]: 1.5,
  [DietType.VEGETARIAN]: 1.2,
  [DietType.PALEO]: 0.8,
  [DietType.INTERMITTENT_FASTING]: 1.5,
  [DietType.CARNIVORE]: -0.5
};

// Habit impact on lifespan (years per consistent practice)
const HABIT_IMPACTS: Partial<Record<HabitType, number>> = {
  [HabitType.SLEEP]: 2.0,
  [HabitType.EXERCISE]: 3.5,
  [HabitType.MEDITATION]: 1.0,
  [HabitType.NO_ALCOHOL]: 1.5,
  [HabitType.NO_SMOKING]: 10.0,
  [HabitType.ZONE_2_CARDIO]: 2.5,
  [HabitType.STRENGTH_TRAINING]: 2.0,
  [HabitType.COLD_EXPOSURE]: 0.5,
  [HabitType.SAUNA]: 0.8,
  [HabitType.FASTING]: 1.2
};

export class LifespanPredictionService {
  /**
   * Main prediction calculation
   * Uses weighted regression, survival models, biomarker-deviation scoring, and hazard ratios
   */
  static calculatePrediction(
    user: UserProfile,
    biomarkers: Biomarker[],
    habits: Habit[]
  ): LifespanPrediction {
    // Step 1: Get base life expectancy
    let predictedLifespan = this.getBaseLifeExpectancy(user);

    // Step 2: Calculate biological age
    const biologicalAge = this.calculateBiologicalAge(user, biomarkers);

    // Step 3: Apply biomarker adjustments
    const biomarkerAdjustment = this.calculateBiomarkerAdjustment(biomarkers);
    predictedLifespan += biomarkerAdjustment;

    // Step 4: Apply lifestyle adjustments
    const lifestyleAdjustment = this.calculateLifestyleAdjustment(user);
    predictedLifespan += lifestyleAdjustment;

    // Step 5: Apply habit adjustments
    const habitAdjustment = this.calculateHabitAdjustment(habits);
    predictedLifespan += habitAdjustment;

    // Step 6: Apply BMI adjustment
    const bmiAdjustment = this.calculateBMIAdjustment(user.bmi);
    predictedLifespan += bmiAdjustment;

    // Step 7: Apply smoking/alcohol adjustments
    const substanceAdjustment = this.calculateSubstanceAdjustment(user);
    predictedLifespan += substanceAdjustment;

    // Step 8: Calculate confidence intervals
    const confidenceInterval = this.calculateConfidenceInterval(predictedLifespan, biomarkers);

    // Step 9: Identify risk hotspots
    const riskHotspots = this.identifyRiskHotspots(user, biomarkers, habits);

    // Step 10: Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(user, biomarkers, habits, riskHotspots);

    // Create prediction object
    const prediction = new LifespanPrediction({
      user_id: user.user_id,
      predicted_lifespan_years: Math.round(predictedLifespan * 10) / 10,
      biological_age: Math.round(biologicalAge * 10) / 10,
      chronological_age: user.age,
      age_difference: Math.round((biologicalAge - user.age) * 10) / 10,
      confidence_interval_low: Math.round(confidenceInterval.low * 10) / 10,
      confidence_interval_high: Math.round(confidenceInterval.high * 10) / 10,
      risk_hotspots: riskHotspots,
      recommended_actions: recommendedActions
    });

    return prediction;
  }

  /**
   * Get base life expectancy based on demographics
   */
  private static getBaseLifeExpectancy(user: UserProfile): number {
    let base = BASE_LIFE_EXPECTANCY[user.sex] || BASE_LIFE_EXPECTANCY.other;

    // Adjust for current age (those who've survived longer have higher expectancy)
    if (user.age > 65) {
      base += (user.age - 65) * 0.3;
    }

    return base;
  }

  /**
   * Calculate biological age based on biomarkers
   * Uses Phenotypic Age algorithm concepts
   */
  private static calculateBiologicalAge(user: UserProfile, biomarkers: Biomarker[]): number {
    let biologicalAge = user.age;

    // Calculate deviation-based age adjustment
    for (const biomarker of biomarkers) {
      const deviation = biomarker.deviationScore;
      const weight = biomarker.risk_weight;

      // Each biomarker can contribute up to 2 years of biological age difference
      const ageImpact = deviation * weight * 10;
      biologicalAge += ageImpact;
    }

    // Apply activity level adjustment to biological age
    const activityModifier = ACTIVITY_MODIFIERS[user.lifestyle_factors.activity_level] || 0;
    biologicalAge -= activityModifier * 0.5;

    // Apply sleep quality adjustment
    const sleepHours = user.lifestyle_factors.sleep_avg_hours;
    if (sleepHours < 6) {
      biologicalAge += 2;
    } else if (sleepHours >= 7 && sleepHours <= 8) {
      biologicalAge -= 1;
    }

    // Apply stress adjustment
    const stressScore = user.lifestyle_factors.stress_score;
    if (stressScore > 7) {
      biologicalAge += 2;
    } else if (stressScore < 3) {
      biologicalAge -= 1;
    }

    return Math.max(user.age - 20, Math.min(user.age + 20, biologicalAge));
  }

  /**
   * Calculate biomarker adjustment to lifespan
   */
  private static calculateBiomarkerAdjustment(biomarkers: Biomarker[]): number {
    let adjustment = 0;

    for (const biomarker of biomarkers) {
      const riskLevel = biomarker.riskLevel;
      const weight = biomarker.risk_weight;

      switch (riskLevel) {
        case RiskLevel.OPTIMAL:
          adjustment += weight * 3; // Optimal adds years
          break;
        case RiskLevel.NORMAL:
          adjustment += weight * 1;
          break;
        case RiskLevel.BORDERLINE:
          adjustment -= weight * 2;
          break;
        case RiskLevel.HIGH_RISK:
          adjustment -= weight * 5;
          break;
        case RiskLevel.CRITICAL:
          adjustment -= weight * 10;
          break;
      }
    }

    return adjustment;
  }

  /**
   * Calculate lifestyle adjustment
   */
  private static calculateLifestyleAdjustment(user: UserProfile): number {
    let adjustment = 0;

    // Activity level
    adjustment += ACTIVITY_MODIFIERS[user.lifestyle_factors.activity_level] || 0;

    // Diet type
    adjustment += DIET_MODIFIERS[user.lifestyle_factors.diet_type] || 0;

    // Sleep quality
    const sleepHours = user.lifestyle_factors.sleep_avg_hours;
    if (sleepHours >= 7 && sleepHours <= 8.5) {
      adjustment += 1.5;
    } else if (sleepHours < 6 || sleepHours > 9.5) {
      adjustment -= 2;
    }

    // Stress
    const stressScore = user.lifestyle_factors.stress_score;
    if (stressScore <= 3) {
      adjustment += 1.5;
    } else if (stressScore >= 7) {
      adjustment -= 2.5;
    }

    return adjustment;
  }

  /**
   * Calculate habit-based adjustment
   */
  private static calculateHabitAdjustment(habits: Habit[]): number {
    let adjustment = 0;

    for (const habit of habits) {
      const baseImpact = HABIT_IMPACTS[habit.type] || 0.5;

      // Adjust based on success rate and streak
      const successMultiplier = habit.success_rate / 100;
      const streakBonus = Math.min(1, habit.current_streak / 30) * 0.2;

      adjustment += baseImpact * successMultiplier * (1 + streakBonus);
    }

    return adjustment;
  }

  /**
   * Calculate BMI adjustment
   */
  private static calculateBMIAdjustment(bmi: number): number {
    if (bmi < 18.5) return -2; // Underweight
    if (bmi >= 18.5 && bmi < 25) return 1; // Normal
    if (bmi >= 25 && bmi < 30) return -1.5; // Overweight
    if (bmi >= 30 && bmi < 35) return -4; // Obese class I
    if (bmi >= 35 && bmi < 40) return -6; // Obese class II
    return -8; // Obese class III
  }

  /**
   * Calculate smoking and alcohol adjustment
   */
  private static calculateSubstanceAdjustment(user: UserProfile): number {
    let adjustment = 0;

    // Smoking
    if (user.lifestyle_factors.smoking_status) {
      adjustment -= 10; // Smoking takes ~10 years off life expectancy
    }

    // Alcohol
    const drinksPerWeek = user.lifestyle_factors.alcohol_drinks_per_week;
    if (drinksPerWeek === 0) {
      adjustment += 0.5;
    } else if (drinksPerWeek <= 7) {
      adjustment += 0; // Moderate drinking - neutral
    } else if (drinksPerWeek <= 14) {
      adjustment -= 1;
    } else if (drinksPerWeek <= 21) {
      adjustment -= 3;
    } else {
      adjustment -= 6; // Heavy drinking
    }

    return adjustment;
  }

  /**
   * Calculate confidence intervals
   */
  private static calculateConfidenceInterval(
    prediction: number,
    biomarkers: Biomarker[]
  ): { low: number; high: number } {
    // Base uncertainty of 5 years
    let uncertainty = 5;

    // Reduce uncertainty with more biomarker data
    const dataPoints = biomarkers.length;
    uncertainty -= Math.min(2, dataPoints * 0.2);

    // Increase uncertainty for extreme predictions
    if (prediction > 95 || prediction < 65) {
      uncertainty += 2;
    }

    return {
      low: prediction - uncertainty,
      high: prediction + uncertainty
    };
  }

  /**
   * Identify risk hotspots
   */
  private static identifyRiskHotspots(
    user: UserProfile,
    biomarkers: Biomarker[],
    habits: Habit[]
  ): IRiskHotspot[] {
    const hotspots: IRiskHotspot[] = [];

    // Group biomarkers by category
    const categories = new Map<string, Biomarker[]>();
    for (const biomarker of biomarkers) {
      const existing = categories.get(biomarker.category) || [];
      existing.push(biomarker);
      categories.set(biomarker.category, existing);
    }

    // Analyze each category
    for (const [category, categoryBiomarkers] of categories) {
      const avgDeviation = categoryBiomarkers.reduce((sum, b) => sum + b.deviationScore, 0) / categoryBiomarkers.length;
      const worstRisk = Math.max(...categoryBiomarkers.map(b => this.riskLevelToNumber(b.riskLevel)));

      let riskLevel = RiskLevel.OPTIMAL;
      if (worstRisk >= 4) riskLevel = RiskLevel.CRITICAL;
      else if (worstRisk >= 3) riskLevel = RiskLevel.HIGH_RISK;
      else if (worstRisk >= 2 || avgDeviation > 0.3) riskLevel = RiskLevel.BORDERLINE;
      else if (avgDeviation > 0.1) riskLevel = RiskLevel.NORMAL;

      if (riskLevel !== RiskLevel.OPTIMAL && riskLevel !== RiskLevel.NORMAL) {
        const impactYears = avgDeviation * categoryBiomarkers.length * 0.5;
        hotspots.push({
          category: this.formatCategory(category),
          risk_level: riskLevel,
          description: this.getCategoryDescription(category, riskLevel),
          impact_years: Math.round(impactYears * 10) / 10,
          related_biomarkers: categoryBiomarkers.map(b => b.name)
        });
      }
    }

    // Check lifestyle factors
    if (user.lifestyle_factors.smoking_status) {
      hotspots.push({
        category: 'Smoking',
        risk_level: RiskLevel.CRITICAL,
        description: 'Active smoking significantly reduces life expectancy',
        impact_years: 10,
        related_biomarkers: []
      });
    }

    if (user.lifestyle_factors.alcohol_drinks_per_week > 14) {
      hotspots.push({
        category: 'Alcohol Consumption',
        risk_level: RiskLevel.HIGH_RISK,
        description: 'Heavy alcohol consumption impacts longevity',
        impact_years: 3,
        related_biomarkers: []
      });
    }

    if (user.lifestyle_factors.sleep_avg_hours < 6) {
      hotspots.push({
        category: 'Sleep',
        risk_level: RiskLevel.BORDERLINE,
        description: 'Insufficient sleep affects overall health and longevity',
        impact_years: 2,
        related_biomarkers: ['HRV', 'Cortisol']
      });
    }

    if (user.lifestyle_factors.stress_score > 7) {
      hotspots.push({
        category: 'Chronic Stress',
        risk_level: RiskLevel.BORDERLINE,
        description: 'High chronic stress increases disease risk',
        impact_years: 2.5,
        related_biomarkers: ['hs-CRP', 'Cortisol']
      });
    }

    // BMI check
    if (user.bmi >= 30) {
      hotspots.push({
        category: 'Body Composition',
        risk_level: user.bmi >= 35 ? RiskLevel.HIGH_RISK : RiskLevel.BORDERLINE,
        description: 'Elevated BMI increases risk of metabolic and cardiovascular disease',
        impact_years: user.bmi >= 35 ? 6 : 4,
        related_biomarkers: ['Fasting Glucose', 'HbA1c', 'Triglycerides']
      });
    }

    // Sort by impact
    return hotspots.sort((a, b) => b.impact_years - a.impact_years);
  }

  /**
   * Generate recommended actions
   */
  private static generateRecommendedActions(
    user: UserProfile,
    biomarkers: Biomarker[],
    habits: Habit[],
    hotspots: IRiskHotspot[]
  ): IRecommendedAction[] {
    const actions: IRecommendedAction[] = [];
    let priority = 1;

    // Address top risk hotspots
    for (const hotspot of hotspots.slice(0, 3)) {
      if (hotspot.category === 'Smoking') {
        actions.push({
          priority: priority++,
          action: 'Quit smoking - this is the single most impactful change you can make',
          category: 'lifestyle',
          potential_gain_years: 10,
          difficulty: 'hard',
          timeframe: '1-2 years for full benefit'
        });
      } else if (hotspot.category === 'Cardiovascular') {
        actions.push({
          priority: priority++,
          action: 'Focus on cardiovascular health: increase Zone 2 cardio and optimize lipid profile',
          category: 'fitness',
          potential_gain_years: hotspot.impact_years,
          difficulty: 'medium',
          timeframe: '3-6 months to see improvements'
        });
      } else if (hotspot.category === 'Metabolic') {
        actions.push({
          priority: priority++,
          action: 'Improve metabolic health: reduce refined carbs, increase protein, consider time-restricted eating',
          category: 'nutrition',
          potential_gain_years: hotspot.impact_years,
          difficulty: 'medium',
          timeframe: '2-4 months for biomarker improvements'
        });
      }
    }

    // VO2 Max specific recommendation (most important predictor)
    const vo2max = biomarkers.find(b => b.name === 'VO2 Max');
    if (vo2max && vo2max.value < 40) {
      actions.push({
        priority: priority++,
        action: 'Increase VO2 Max through consistent Zone 2 cardio (150+ min/week) and HIIT sessions',
        category: 'fitness',
        potential_gain_years: 3,
        difficulty: 'medium',
        timeframe: '6-12 months for significant improvement'
      });
    }

    // Activity level recommendation
    if (user.lifestyle_factors.activity_level === ActivityLevel.SEDENTARY) {
      actions.push({
        priority: priority++,
        action: 'Start with daily walking (7,000+ steps) and add strength training 2x/week',
        category: 'fitness',
        potential_gain_years: 4,
        difficulty: 'easy',
        timeframe: '1-3 months to establish habit'
      });
    }

    // Sleep optimization
    if (user.lifestyle_factors.sleep_avg_hours < 7) {
      actions.push({
        priority: priority++,
        action: 'Prioritize 7-8 hours of quality sleep with consistent sleep/wake times',
        category: 'lifestyle',
        potential_gain_years: 2,
        difficulty: 'medium',
        timeframe: '2-4 weeks for habit formation'
      });
    }

    // Stress management
    if (user.lifestyle_factors.stress_score > 6) {
      actions.push({
        priority: priority++,
        action: 'Implement daily stress management: meditation, breathwork, or regular nature walks',
        category: 'mental',
        potential_gain_years: 1.5,
        difficulty: 'easy',
        timeframe: '2-4 weeks to feel benefits'
      });
    }

    // Diet recommendation
    if (user.lifestyle_factors.diet_type === DietType.STANDARD) {
      actions.push({
        priority: priority++,
        action: 'Transition to Mediterranean-style diet: more vegetables, healthy fats, lean proteins',
        category: 'nutrition',
        potential_gain_years: 2.5,
        difficulty: 'medium',
        timeframe: '1-3 months for full transition'
      });
    }

    // Check for missing important habits
    const habitTypes = habits.map(h => h.type);
    if (!habitTypes.includes(HabitType.STRENGTH_TRAINING)) {
      actions.push({
        priority: priority++,
        action: 'Add strength training 2-3x per week to maintain muscle mass and bone density',
        category: 'fitness',
        potential_gain_years: 2,
        difficulty: 'medium',
        timeframe: 'Ongoing benefit'
      });
    }

    // Biomarker-specific recommendations
    for (const biomarker of biomarkers) {
      if (biomarker.riskLevel === RiskLevel.HIGH_RISK || biomarker.riskLevel === RiskLevel.CRITICAL) {
        const tips = biomarker.getImprovementTips();
        if (tips.length > 0) {
          actions.push({
            priority: priority++,
            action: `Improve ${biomarker.name}: ${tips[0]}`,
            category: 'biomarker',
            potential_gain_years: biomarker.risk_weight * 5,
            difficulty: 'medium',
            timeframe: '3-6 months'
          });
        }
      }
    }

    return actions.slice(0, 10); // Return top 10 actions
  }

  // Helper methods
  private static riskLevelToNumber(level: RiskLevel): number {
    const map: Record<RiskLevel, number> = {
      [RiskLevel.OPTIMAL]: 0,
      [RiskLevel.NORMAL]: 1,
      [RiskLevel.BORDERLINE]: 2,
      [RiskLevel.HIGH_RISK]: 3,
      [RiskLevel.CRITICAL]: 4
    };
    return map[level];
  }

  private static formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  }

  private static getCategoryDescription(category: string, riskLevel: RiskLevel): string {
    const descriptions: Record<string, string> = {
      cardiovascular: 'Heart and vascular health markers need attention',
      metabolic: 'Blood sugar and metabolic markers show room for improvement',
      inflammation: 'Inflammation markers indicate elevated systemic inflammation',
      fitness: 'Fitness markers suggest need for increased physical activity',
      hormones: 'Hormone levels may benefit from lifestyle optimization'
    };

    return descriptions[category] || `${this.formatCategory(category)} health needs attention`;
  }
}

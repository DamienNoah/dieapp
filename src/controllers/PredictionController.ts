import { Request, Response } from 'express';
import { LifespanPrediction } from '../models/LifespanPrediction';
import { Biomarker } from '../models/Biomarker';
import { UserProfile } from '../models/UserProfile';
import { Habit } from '../models/Habit';
import { Points } from '../models/Points';
import { LifespanPredictionService } from '../services/LifespanPredictionService';
import { IApiResponse, ILifespanPrediction, RiskLevel } from '../models/types';

interface PredictionComparison {
  current: ILifespanPrediction;
  previous: ILifespanPrediction | null;
  lifespan_change: number | null;
  biological_age_change: number | null;
  improvements: string[];
  concerns: string[];
}

export class PredictionController {
  // Run lifespan prediction model
  static async runPrediction(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Verify user exists
      const user = UserProfile.findById(userId);
      if (!user) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      // Get biomarkers
      const biomarkers = Biomarker.getLatestForUser(userId);
      if (biomarkers.length === 0) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'No biomarker data available. Please log some biomarkers first.'
        };
        res.status(400).json(response);
        return;
      }

      // Get habits
      const habits = Habit.findByUserId(userId);

      // Run prediction
      const prediction = LifespanPredictionService.calculatePrediction(user, biomarkers, habits);
      await prediction.save();

      // Award points for running prediction
      const points = await Points.getOrCreate(userId);
      await points.addPoints(10, 'Ran lifespan prediction', 'prediction');

      const response: IApiResponse<ILifespanPrediction> = {
        success: true,
        data: prediction.toJSON(),
        message: 'Prediction calculated successfully'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run prediction'
      };
      res.status(500).json(response);
    }
  }

  // Get latest prediction
  static async getLatestPrediction(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const prediction = LifespanPrediction.findLatestByUserId(userId);
      if (!prediction) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'No prediction found. Run a prediction first.'
        };
        res.status(404).json(response);
        return;
      }

      const response: IApiResponse<ILifespanPrediction> = {
        success: true,
        data: prediction.toJSON()
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch prediction'
      };
      res.status(500).json(response);
    }
  }

  // Get prediction history
  static async getPredictionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 30;

      const predictions = LifespanPrediction.findHistoryByUserId(userId, limit);

      const response: IApiResponse<ILifespanPrediction[]> = {
        success: true,
        data: predictions.map(p => p.toJSON())
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch prediction history'
      };
      res.status(500).json(response);
    }
  }

  // Compare current prediction with previous
  static async comparePredictions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const predictions = LifespanPrediction.findHistoryByUserId(userId, 2);

      if (predictions.length === 0) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'No predictions found'
        };
        res.status(404).json(response);
        return;
      }

      const current = predictions[0];
      const previous = predictions.length > 1 ? predictions[1] : null;

      const improvements: string[] = [];
      const concerns: string[] = [];

      if (previous) {
        // Check lifespan change
        if (current.predicted_lifespan_years > previous.predicted_lifespan_years) {
          improvements.push(`Predicted lifespan increased by ${(current.predicted_lifespan_years - previous.predicted_lifespan_years).toFixed(1)} years`);
        } else if (current.predicted_lifespan_years < previous.predicted_lifespan_years) {
          concerns.push(`Predicted lifespan decreased by ${(previous.predicted_lifespan_years - current.predicted_lifespan_years).toFixed(1)} years`);
        }

        // Check biological age change
        if (current.biological_age < previous.biological_age) {
          improvements.push(`Biological age improved by ${(previous.biological_age - current.biological_age).toFixed(1)} years`);
        } else if (current.biological_age > previous.biological_age) {
          concerns.push(`Biological age increased by ${(current.biological_age - previous.biological_age).toFixed(1)} years`);
        }

        // Check risk hotspots
        const currentCritical = current.risk_hotspots.filter(r => r.risk_level === RiskLevel.CRITICAL || r.risk_level === RiskLevel.HIGH_RISK).length;
        const previousCritical = previous.risk_hotspots.filter(r => r.risk_level === RiskLevel.CRITICAL || r.risk_level === RiskLevel.HIGH_RISK).length;

        if (currentCritical < previousCritical) {
          improvements.push(`Reduced high-risk areas from ${previousCritical} to ${currentCritical}`);
        } else if (currentCritical > previousCritical) {
          concerns.push(`High-risk areas increased from ${previousCritical} to ${currentCritical}`);
        }
      }

      const comparison: PredictionComparison = {
        current: current.toJSON(),
        previous: previous?.toJSON() || null,
        lifespan_change: previous ? current.predicted_lifespan_years - previous.predicted_lifespan_years : null,
        biological_age_change: previous ? current.biological_age - previous.biological_age : null,
        improvements,
        concerns
      };

      const response: IApiResponse<PredictionComparison> = {
        success: true,
        data: comparison
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare predictions'
      };
      res.status(500).json(response);
    }
  }

  // Get risk hotspots
  static async getRiskHotspots(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const prediction = LifespanPrediction.findLatestByUserId(userId);
      if (!prediction) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'No prediction found'
        };
        res.status(404).json(response);
        return;
      }

      const hotspots = prediction.getTopRiskHotspots(10);

      const response: IApiResponse<typeof hotspots> = {
        success: true,
        data: hotspots
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch risk hotspots'
      };
      res.status(500).json(response);
    }
  }

  // Get recommended actions
  static async getRecommendedActions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const prediction = LifespanPrediction.findLatestByUserId(userId);
      if (!prediction) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'No prediction found'
        };
        res.status(404).json(response);
        return;
      }

      const actions = prediction.getHighPriorityActions(10);
      const totalPotentialGain = prediction.getTotalPotentialGain();

      const response: IApiResponse<{ actions: typeof actions; total_potential_gain_years: number }> = {
        success: true,
        data: {
          actions,
          total_potential_gain_years: Math.round(totalPotentialGain * 10) / 10
        }
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recommended actions'
      };
      res.status(500).json(response);
    }
  }

  // Get biological age breakdown
  static async getBiologicalAgeBreakdown(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = UserProfile.findById(userId);
      if (!user) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      const prediction = LifespanPrediction.findLatestByUserId(userId);
      if (!prediction) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'No prediction found'
        };
        res.status(404).json(response);
        return;
      }

      const biomarkers = Biomarker.getLatestForUser(userId);

      // Calculate contribution of each category to biological age
      const categoryContributions: Record<string, { impact_years: number; status: string }> = {};

      for (const biomarker of biomarkers) {
        if (!categoryContributions[biomarker.category]) {
          categoryContributions[biomarker.category] = { impact_years: 0, status: 'optimal' };
        }

        const deviation = biomarker.deviationScore;
        const impact = deviation * biomarker.risk_weight * 5; // Up to 5 years per category

        categoryContributions[biomarker.category].impact_years += impact;

        if (biomarker.riskLevel === RiskLevel.CRITICAL || biomarker.riskLevel === RiskLevel.HIGH_RISK) {
          categoryContributions[biomarker.category].status = 'high_risk';
        } else if (biomarker.riskLevel === RiskLevel.BORDERLINE && categoryContributions[biomarker.category].status !== 'high_risk') {
          categoryContributions[biomarker.category].status = 'borderline';
        }
      }

      const breakdown = {
        chronological_age: user.age,
        biological_age: prediction.biological_age,
        age_difference: prediction.age_difference,
        category_contributions: Object.entries(categoryContributions).map(([category, data]) => ({
          category,
          impact_years: Math.round(data.impact_years * 10) / 10,
          status: data.status
        })).sort((a, b) => b.impact_years - a.impact_years),
        interpretation: getAgeInterpretation(prediction.age_difference)
      };

      const response: IApiResponse<typeof breakdown> = {
        success: true,
        data: breakdown
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch biological age breakdown'
      };
      res.status(500).json(response);
    }
  }

  // Get prediction trend
  static async getPredictionTrend(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const trend = LifespanPrediction.getTrend(userId, days);

      const response: IApiResponse<typeof trend> = {
        success: true,
        data: trend
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch prediction trend'
      };
      res.status(500).json(response);
    }
  }

  // Get motivational insight
  static async getMotivationalInsight(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const prediction = LifespanPrediction.findLatestByUserId(userId);
      const user = UserProfile.findById(userId);
      const habits = Habit.findByUserId(userId);

      let insight = '';

      if (prediction && user) {
        const ageDiff = prediction.age_difference;
        const topAction = prediction.recommended_actions[0];

        if (ageDiff <= -5) {
          insight = `Your biological age is ${Math.abs(ageDiff).toFixed(1)} years younger than your chronological age! Keep up the excellent work.`;
        } else if (ageDiff <= 0) {
          insight = `You're doing well! Your biological age matches or is slightly better than your chronological age.`;
        } else if (ageDiff <= 5) {
          insight = `There's room for improvement. ${topAction?.action || 'Focus on your habits'} could help reduce your biological age.`;
        } else {
          insight = `Your biological age needs attention. ${topAction?.action || 'Start with small habit changes'} to begin reversing the trend.`;
        }

        // Add habit-specific insight
        const activeStreaks = habits.filter(h => h.current_streak > 7).length;
        if (activeStreaks > 0) {
          insight += ` You have ${activeStreaks} habit(s) with strong streaks - this consistency is key to longevity!`;
        }

        // Add potential gain insight
        if (prediction.recommended_actions.length > 0) {
          const potentialGain = prediction.getTotalPotentialGain();
          insight += ` Following all recommendations could add up to ${potentialGain.toFixed(1)} years to your predicted lifespan.`;
        }
      } else {
        insight = 'Start logging your biomarkers and habits to receive personalized longevity insights!';
      }

      const response: IApiResponse<{ insight: string }> = {
        success: true,
        data: { insight }
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate motivational insight'
      };
      res.status(500).json(response);
    }
  }
}

// Helper function for age interpretation
function getAgeInterpretation(ageDifference: number): string {
  if (ageDifference <= -10) {
    return 'Exceptional! Your body is functioning like someone much younger.';
  } else if (ageDifference <= -5) {
    return 'Excellent! You\'re aging slower than average.';
  } else if (ageDifference <= 0) {
    return 'Good! Your biological age is at or below your chronological age.';
  } else if (ageDifference <= 5) {
    return 'Fair. There\'s room for improvement to reverse biological aging.';
  } else {
    return 'Your biological age suggests accelerated aging. Focus on the recommended actions to improve.';
  }
}

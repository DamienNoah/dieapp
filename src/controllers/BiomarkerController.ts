import { Request, Response } from 'express';
import { Biomarker, BIOMARKER_DEFINITIONS } from '../models/Biomarker';
import { UserProfile } from '../models/UserProfile';
import { Points } from '../models/Points';
import { IApiResponse, IBiomarker, IBiomarkerDefinition, RiskLevel } from '../models/types';

interface BiomarkerTrend {
  name: string;
  current_value: number;
  previous_value: number | null;
  change: number | null;
  change_percentage: number | null;
  trend: 'improving' | 'stable' | 'declining';
  risk_level: RiskLevel;
}

interface BiomarkerAnalytics {
  name: string;
  unit: string;
  history: { timestamp: Date; value: number }[];
  average: number;
  min: number;
  max: number;
  trend: 'improving' | 'stable' | 'declining';
  risk_level: RiskLevel;
  improvement_tips: string[];
}

export class BiomarkerController {
  // Add a new biomarker value
  static async addBiomarkerValue(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { biomarker_key, value, timestamp } = req.body;

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

      // Validate biomarker key
      if (!BIOMARKER_DEFINITIONS[biomarker_key]) {
        const response: IApiResponse<null> = {
          success: false,
          error: `Unknown biomarker: ${biomarker_key}. Valid options: ${Object.keys(BIOMARKER_DEFINITIONS).join(', ')}`
        };
        res.status(400).json(response);
        return;
      }

      // Create biomarker from definition
      const biomarker = Biomarker.createFromDefinition(userId, biomarker_key, value);
      if (timestamp) {
        biomarker.timestamp = new Date(timestamp);
      }

      await biomarker.save();

      // Check for risk and award points
      let pointsEarned = 5; // Base points for logging
      let message = 'Biomarker logged successfully';

      if (biomarker.riskLevel === RiskLevel.OPTIMAL) {
        pointsEarned = 15;
        message = 'Excellent! Your biomarker is in the optimal range!';
      } else if (biomarker.riskLevel === RiskLevel.HIGH_RISK || biomarker.riskLevel === RiskLevel.CRITICAL) {
        message = `Warning: Your ${biomarker.name} is outside the healthy range. Consider consulting a healthcare provider.`;
      }

      const points = await Points.getOrCreate(userId);
      await points.addPoints(pointsEarned, `Logged ${biomarker.name}`, 'biomarker_log');

      const response: IApiResponse<{ biomarker: IBiomarker; points_earned: number }> = {
        success: true,
        data: {
          biomarker: biomarker.toJSON(),
          points_earned: pointsEarned
        },
        message
      };
      res.status(201).json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add biomarker value'
      };
      res.status(500).json(response);
    }
  }

  // Add custom biomarker (not from definitions)
  static async addCustomBiomarker(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        name,
        value,
        unit,
        clinical_range_min,
        clinical_range_max,
        optimal_range_min,
        optimal_range_max,
        category,
        timestamp
      } = req.body;

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

      const biomarker = new Biomarker({
        user_id: userId,
        name,
        value,
        unit,
        clinical_range_min,
        clinical_range_max,
        optimal_range_min: optimal_range_min || clinical_range_min,
        optimal_range_max: optimal_range_max || clinical_range_max,
        category: category || 'custom',
        risk_weight: 0.05,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });

      await biomarker.save();

      // Award points
      const points = await Points.getOrCreate(userId);
      await points.addPoints(5, `Logged custom biomarker: ${name}`, 'biomarker_log');

      const response: IApiResponse<IBiomarker> = {
        success: true,
        data: biomarker.toJSON(),
        message: 'Custom biomarker logged successfully'
      };
      res.status(201).json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add custom biomarker'
      };
      res.status(500).json(response);
    }
  }

  // Get latest biomarker values for user
  static async getLatestBiomarkers(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const biomarkers = Biomarker.getLatestForUser(userId);

      const response: IApiResponse<IBiomarker[]> = {
        success: true,
        data: biomarkers.map(b => b.toJSON())
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch biomarkers'
      };
      res.status(500).json(response);
    }
  }

  // Get biomarker history
  static async getBiomarkerHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId, biomarkerName } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const history = Biomarker.findHistoryByName(userId, biomarkerName, limit);

      const response: IApiResponse<IBiomarker[]> = {
        success: true,
        data: history.map(b => b.toJSON())
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch biomarker history'
      };
      res.status(500).json(response);
    }
  }

  // Get trend analytics for a biomarker
  static async getTrendAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { userId, biomarkerName } = req.params;

      const history = Biomarker.findHistoryByName(userId, biomarkerName, 100);

      if (history.length === 0) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'No data found for this biomarker'
        };
        res.status(404).json(response);
        return;
      }

      const values = history.map(b => b.value);
      const latest = history[0];

      // Calculate trend
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (history.length >= 3) {
        const recentAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const olderAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3;

        // Determine if higher or lower is better based on optimal range
        const optimalMid = (latest.optimal_range_min + latest.optimal_range_max) / 2;
        const lowerIsBetter = latest.optimal_range_max < latest.clinical_range_max;

        if (lowerIsBetter) {
          if (recentAvg < olderAvg - 0.05 * olderAvg) trend = 'improving';
          else if (recentAvg > olderAvg + 0.05 * olderAvg) trend = 'declining';
        } else {
          if (recentAvg > olderAvg + 0.05 * olderAvg) trend = 'improving';
          else if (recentAvg < olderAvg - 0.05 * olderAvg) trend = 'declining';
        }
      }

      const analytics: BiomarkerAnalytics = {
        name: latest.name,
        unit: latest.unit,
        history: history.map(b => ({ timestamp: b.timestamp, value: b.value })),
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        trend,
        risk_level: latest.riskLevel,
        improvement_tips: latest.getImprovementTips()
      };

      const response: IApiResponse<BiomarkerAnalytics> = {
        success: true,
        data: analytics
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trend analytics'
      };
      res.status(500).json(response);
    }
  }

  // Get all biomarker trends summary
  static async getAllTrends(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const latestBiomarkers = Biomarker.getLatestForUser(userId);
      const trends: BiomarkerTrend[] = [];

      for (const biomarker of latestBiomarkers) {
        const history = Biomarker.findHistoryByName(userId, biomarker.name, 10);

        let previousValue: number | null = null;
        let change: number | null = null;
        let changePercentage: number | null = null;
        let trend: 'improving' | 'stable' | 'declining' = 'stable';

        if (history.length >= 2) {
          previousValue = history[1].value;
          change = biomarker.value - previousValue;
          changePercentage = (change / previousValue) * 100;

          // Determine trend based on whether lower or higher is better
          const lowerIsBetter = biomarker.optimal_range_max < biomarker.clinical_range_max;

          if (Math.abs(changePercentage) > 5) {
            if (lowerIsBetter) {
              trend = change < 0 ? 'improving' : 'declining';
            } else {
              trend = change > 0 ? 'improving' : 'declining';
            }
          }
        }

        trends.push({
          name: biomarker.name,
          current_value: biomarker.value,
          previous_value: previousValue,
          change,
          change_percentage: changePercentage ? Math.round(changePercentage * 10) / 10 : null,
          trend,
          risk_level: biomarker.riskLevel
        });
      }

      const response: IApiResponse<BiomarkerTrend[]> = {
        success: true,
        data: trends
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch biomarker trends'
      };
      res.status(500).json(response);
    }
  }

  // Get biomarker definitions
  static async getBiomarkerDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;

      let definitions = Object.entries(BIOMARKER_DEFINITIONS).map(([key, def]) => ({
        key,
        ...def
      }));

      if (category) {
        definitions = definitions.filter(d => d.category === category);
      }

      const response: IApiResponse<typeof definitions> = {
        success: true,
        data: definitions
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch biomarker definitions'
      };
      res.status(500).json(response);
    }
  }

  // Check for risk alerts
  static async checkRiskAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const biomarkers = Biomarker.getLatestForUser(userId);
      const alerts: { name: string; value: number; unit: string; risk_level: RiskLevel; message: string }[] = [];

      for (const biomarker of biomarkers) {
        if (biomarker.riskLevel === RiskLevel.HIGH_RISK || biomarker.riskLevel === RiskLevel.CRITICAL) {
          let message = '';
          if (biomarker.value < biomarker.clinical_range_min) {
            message = `${biomarker.name} is below normal range`;
          } else if (biomarker.value > biomarker.clinical_range_max) {
            message = `${biomarker.name} is above normal range`;
          } else {
            message = `${biomarker.name} needs attention`;
          }

          alerts.push({
            name: biomarker.name,
            value: biomarker.value,
            unit: biomarker.unit,
            risk_level: biomarker.riskLevel,
            message
          });
        }
      }

      const response: IApiResponse<typeof alerts> = {
        success: true,
        data: alerts,
        message: alerts.length > 0 ? `${alerts.length} biomarker(s) need attention` : 'All biomarkers are within healthy ranges'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check risk alerts'
      };
      res.status(500).json(response);
    }
  }

  // Delete a biomarker entry
  static async deleteBiomarker(req: Request, res: Response): Promise<void> {
    try {
      const { biomarkerId } = req.params;

      const biomarker = Biomarker.findById(biomarkerId);
      if (!biomarker) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Biomarker not found'
        };
        res.status(404).json(response);
        return;
      }

      await biomarker.delete();

      const response: IApiResponse<null> = {
        success: true,
        message: 'Biomarker deleted successfully'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete biomarker'
      };
      res.status(500).json(response);
    }
  }
}

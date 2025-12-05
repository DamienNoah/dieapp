import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/Database';
import {
  ILifespanPrediction,
  IRiskHotspot,
  IRecommendedAction,
  RiskLevel
} from './types';

export class LifespanPrediction implements ILifespanPrediction {
  prediction_id: string;
  user_id: string;
  predicted_lifespan_years: number;
  biological_age: number;
  chronological_age: number;
  age_difference: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  risk_hotspots: IRiskHotspot[];
  recommended_actions: IRecommendedAction[];
  calculated_at: Date;

  constructor(data: Partial<ILifespanPrediction>) {
    this.prediction_id = data.prediction_id || uuidv4();
    this.user_id = data.user_id || '';
    this.predicted_lifespan_years = data.predicted_lifespan_years || 0;
    this.biological_age = data.biological_age || 0;
    this.chronological_age = data.chronological_age || 0;
    this.age_difference = data.age_difference || 0;
    this.confidence_interval_low = data.confidence_interval_low || 0;
    this.confidence_interval_high = data.confidence_interval_high || 0;
    this.risk_hotspots = data.risk_hotspots || [];
    this.recommended_actions = data.recommended_actions || [];
    this.calculated_at = data.calculated_at || new Date();
  }

  // Get lifespan category
  get lifespanCategory(): string {
    if (this.predicted_lifespan_years >= 95) return 'Exceptional';
    if (this.predicted_lifespan_years >= 85) return 'Above Average';
    if (this.predicted_lifespan_years >= 78) return 'Average';
    if (this.predicted_lifespan_years >= 70) return 'Below Average';
    return 'Needs Attention';
  }

  // Get biological age status
  get biologicalAgeStatus(): string {
    const diff = this.age_difference;
    if (diff <= -10) return 'Exceptional';
    if (diff <= -5) return 'Excellent';
    if (diff <= 0) return 'Good';
    if (diff <= 5) return 'Fair';
    return 'Needs Improvement';
  }

  // Save to database
  async save(): Promise<LifespanPrediction> {
    const db = Database.getInstance();

    db.run(`
      INSERT OR REPLACE INTO lifespan_predictions (
        prediction_id, user_id, predicted_lifespan_years,
        biological_age, chronological_age, age_difference,
        confidence_interval_low, confidence_interval_high,
        risk_hotspots, recommended_actions, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.prediction_id,
      this.user_id,
      this.predicted_lifespan_years,
      this.biological_age,
      this.chronological_age,
      this.age_difference,
      this.confidence_interval_low,
      this.confidence_interval_high,
      JSON.stringify(this.risk_hotspots),
      JSON.stringify(this.recommended_actions),
      this.calculated_at.toISOString()
    ]);

    return this;
  }

  // Find by ID
  static findById(predictionId: string): LifespanPrediction | null {
    const db = Database.getInstance();
    const row = db.get<any>(
      'SELECT * FROM lifespan_predictions WHERE prediction_id = ?',
      [predictionId]
    );

    if (!row) return null;
    return LifespanPrediction.fromRow(row);
  }

  // Find latest prediction for user
  static findLatestByUserId(userId: string): LifespanPrediction | null {
    const db = Database.getInstance();
    const row = db.get<any>(
      'SELECT * FROM lifespan_predictions WHERE user_id = ? ORDER BY calculated_at DESC LIMIT 1',
      [userId]
    );

    if (!row) return null;
    return LifespanPrediction.fromRow(row);
  }

  // Find prediction history for user
  static findHistoryByUserId(userId: string, limit: number = 50): LifespanPrediction[] {
    const db = Database.getInstance();
    const rows = db.all<any>(
      'SELECT * FROM lifespan_predictions WHERE user_id = ? ORDER BY calculated_at DESC LIMIT ?',
      [userId, limit]
    );

    return rows.map(row => LifespanPrediction.fromRow(row));
  }

  // Get trend over time
  static getTrend(userId: string, days: number = 30): { date: Date; value: number }[] {
    const db = Database.getInstance();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const rows = db.all<any>(
      `SELECT predicted_lifespan_years, calculated_at
       FROM lifespan_predictions
       WHERE user_id = ? AND calculated_at >= ?
       ORDER BY calculated_at ASC`,
      [userId, startDate.toISOString()]
    );

    return rows.map(row => ({
      date: new Date(row.calculated_at),
      value: row.predicted_lifespan_years
    }));
  }

  // Convert database row to LifespanPrediction
  private static fromRow(row: any): LifespanPrediction {
    return new LifespanPrediction({
      prediction_id: row.prediction_id,
      user_id: row.user_id,
      predicted_lifespan_years: row.predicted_lifespan_years,
      biological_age: row.biological_age,
      chronological_age: row.chronological_age,
      age_difference: row.age_difference,
      confidence_interval_low: row.confidence_interval_low,
      confidence_interval_high: row.confidence_interval_high,
      risk_hotspots: JSON.parse(row.risk_hotspots || '[]'),
      recommended_actions: JSON.parse(row.recommended_actions || '[]'),
      calculated_at: new Date(row.calculated_at)
    });
  }

  // Add risk hotspot
  addRiskHotspot(hotspot: IRiskHotspot): void {
    this.risk_hotspots.push(hotspot);
  }

  // Add recommended action
  addRecommendedAction(action: IRecommendedAction): void {
    this.recommended_actions.push(action);
    // Sort by priority
    this.recommended_actions.sort((a, b) => a.priority - b.priority);
  }

  // Get top risk hotspots
  getTopRiskHotspots(count: number = 3): IRiskHotspot[] {
    return this.risk_hotspots
      .sort((a, b) => {
        const riskOrder = [RiskLevel.CRITICAL, RiskLevel.HIGH_RISK, RiskLevel.BORDERLINE, RiskLevel.NORMAL, RiskLevel.OPTIMAL];
        return riskOrder.indexOf(a.risk_level) - riskOrder.indexOf(b.risk_level);
      })
      .slice(0, count);
  }

  // Get high priority actions
  getHighPriorityActions(count: number = 5): IRecommendedAction[] {
    return this.recommended_actions
      .filter(a => a.priority <= 3)
      .slice(0, count);
  }

  // Calculate total potential lifespan gain
  getTotalPotentialGain(): number {
    return this.recommended_actions.reduce((sum, action) => sum + action.potential_gain_years, 0);
  }

  // Convert to JSON
  toJSON(): ILifespanPrediction {
    return {
      prediction_id: this.prediction_id,
      user_id: this.user_id,
      predicted_lifespan_years: this.predicted_lifespan_years,
      biological_age: this.biological_age,
      chronological_age: this.chronological_age,
      age_difference: this.age_difference,
      confidence_interval_low: this.confidence_interval_low,
      confidence_interval_high: this.confidence_interval_high,
      risk_hotspots: this.risk_hotspots,
      recommended_actions: this.recommended_actions,
      calculated_at: this.calculated_at
    };
  }
}

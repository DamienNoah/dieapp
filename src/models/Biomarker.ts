import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/Database';
import { IBiomarker, IBiomarkerDefinition, RiskLevel } from './types';

// Standard biomarker definitions
export const BIOMARKER_DEFINITIONS: Record<string, IBiomarkerDefinition> = {
  // Cardiovascular
  'ldl_cholesterol': {
    name: 'LDL Cholesterol',
    unit: 'mg/dL',
    clinical_range_min: 0,
    clinical_range_max: 190,
    optimal_range_min: 0,
    optimal_range_max: 100,
    risk_weight: 0.15,
    category: 'cardiovascular',
    description: 'Low-density lipoprotein, often called "bad" cholesterol',
    improvement_tips: ['Reduce saturated fat intake', 'Exercise regularly', 'Consider statins if high risk']
  },
  'hdl_cholesterol': {
    name: 'HDL Cholesterol',
    unit: 'mg/dL',
    clinical_range_min: 40,
    clinical_range_max: 100,
    optimal_range_min: 60,
    optimal_range_max: 100,
    risk_weight: 0.12,
    category: 'cardiovascular',
    description: 'High-density lipoprotein, often called "good" cholesterol',
    improvement_tips: ['Exercise regularly', 'Consume healthy fats', 'Avoid trans fats']
  },
  'apob': {
    name: 'ApoB',
    unit: 'mg/dL',
    clinical_range_min: 0,
    clinical_range_max: 130,
    optimal_range_min: 0,
    optimal_range_max: 80,
    risk_weight: 0.18,
    category: 'cardiovascular',
    description: 'Apolipoprotein B - better predictor of cardiovascular risk than LDL',
    improvement_tips: ['Mediterranean diet', 'PCSK9 inhibitors if needed', 'Regular exercise']
  },
  'lp_a': {
    name: 'Lp(a)',
    unit: 'nmol/L',
    clinical_range_min: 0,
    clinical_range_max: 75,
    optimal_range_min: 0,
    optimal_range_max: 30,
    risk_weight: 0.10,
    category: 'cardiovascular',
    description: 'Lipoprotein(a) - genetically determined cardiovascular risk marker',
    improvement_tips: ['Largely genetic', 'Niacin may help', 'Focus on other modifiable risks']
  },
  'blood_pressure_systolic': {
    name: 'Blood Pressure (Systolic)',
    unit: 'mmHg',
    clinical_range_min: 90,
    clinical_range_max: 180,
    optimal_range_min: 90,
    optimal_range_max: 120,
    risk_weight: 0.15,
    category: 'cardiovascular',
    description: 'Pressure in arteries when heart beats',
    improvement_tips: ['Reduce sodium intake', 'Exercise regularly', 'Manage stress', 'DASH diet']
  },
  // Metabolic
  'fasting_glucose': {
    name: 'Fasting Glucose',
    unit: 'mg/dL',
    clinical_range_min: 70,
    clinical_range_max: 125,
    optimal_range_min: 70,
    optimal_range_max: 90,
    risk_weight: 0.14,
    category: 'metabolic',
    description: 'Blood sugar level after fasting',
    improvement_tips: ['Low-carb diet', 'Regular exercise', 'Improve sleep quality', 'Reduce stress']
  },
  'hba1c': {
    name: 'HbA1c',
    unit: '%',
    clinical_range_min: 4.0,
    clinical_range_max: 6.4,
    optimal_range_min: 4.0,
    optimal_range_max: 5.4,
    risk_weight: 0.16,
    category: 'metabolic',
    description: 'Average blood sugar over 2-3 months',
    improvement_tips: ['Reduce refined carbohydrates', 'Time-restricted eating', 'Strength training']
  },
  'fasting_insulin': {
    name: 'Fasting Insulin',
    unit: 'uIU/mL',
    clinical_range_min: 2,
    clinical_range_max: 25,
    optimal_range_min: 2,
    optimal_range_max: 8,
    risk_weight: 0.13,
    category: 'metabolic',
    description: 'Insulin level when fasting - marker of insulin resistance',
    improvement_tips: ['Low-carb diet', 'Intermittent fasting', 'High-intensity exercise']
  },
  'triglycerides': {
    name: 'Triglycerides',
    unit: 'mg/dL',
    clinical_range_min: 0,
    clinical_range_max: 200,
    optimal_range_min: 0,
    optimal_range_max: 100,
    risk_weight: 0.10,
    category: 'metabolic',
    description: 'Fat in the blood',
    improvement_tips: ['Reduce sugar and alcohol', 'Omega-3 fatty acids', 'Regular exercise']
  },
  // Fitness
  'vo2_max': {
    name: 'VO2 Max',
    unit: 'mL/kg/min',
    clinical_range_min: 20,
    clinical_range_max: 60,
    optimal_range_min: 40,
    optimal_range_max: 60,
    risk_weight: 0.20,
    category: 'fitness',
    description: 'Maximum oxygen uptake - strongest predictor of all-cause mortality',
    improvement_tips: ['Zone 2 cardio training', 'High-intensity intervals', 'Consistent exercise routine']
  },
  'hrv': {
    name: 'Heart Rate Variability',
    unit: 'ms',
    clinical_range_min: 20,
    clinical_range_max: 100,
    optimal_range_min: 50,
    optimal_range_max: 100,
    risk_weight: 0.12,
    category: 'fitness',
    description: 'Variation in time between heartbeats - indicator of autonomic health',
    improvement_tips: ['Improve sleep quality', 'Reduce alcohol', 'Meditation and breathwork', 'Regular exercise']
  },
  'resting_heart_rate': {
    name: 'Resting Heart Rate',
    unit: 'bpm',
    clinical_range_min: 50,
    clinical_range_max: 100,
    optimal_range_min: 50,
    optimal_range_max: 65,
    risk_weight: 0.08,
    category: 'fitness',
    description: 'Heart rate at rest',
    improvement_tips: ['Cardiovascular exercise', 'Stress reduction', 'Quality sleep']
  },
  // Inflammation
  'hs_crp': {
    name: 'hs-CRP',
    unit: 'mg/L',
    clinical_range_min: 0,
    clinical_range_max: 3,
    optimal_range_min: 0,
    optimal_range_max: 1,
    risk_weight: 0.12,
    category: 'inflammation',
    description: 'High-sensitivity C-reactive protein - marker of systemic inflammation',
    improvement_tips: ['Anti-inflammatory diet', 'Omega-3s', 'Regular exercise', 'Weight management']
  },
  'homocysteine': {
    name: 'Homocysteine',
    unit: 'umol/L',
    clinical_range_min: 5,
    clinical_range_max: 15,
    optimal_range_min: 5,
    optimal_range_max: 10,
    risk_weight: 0.08,
    category: 'inflammation',
    description: 'Amino acid linked to cardiovascular risk',
    improvement_tips: ['B vitamins (B6, B12, folate)', 'Reduce alcohol', 'Regular exercise']
  },
  // Hormones
  'testosterone': {
    name: 'Testosterone (Total)',
    unit: 'ng/dL',
    clinical_range_min: 300,
    clinical_range_max: 1000,
    optimal_range_min: 500,
    optimal_range_max: 900,
    risk_weight: 0.08,
    category: 'hormones',
    description: 'Primary male sex hormone',
    improvement_tips: ['Strength training', 'Quality sleep', 'Reduce stress', 'Maintain healthy weight']
  },
  'vitamin_d': {
    name: 'Vitamin D (25-OH)',
    unit: 'ng/mL',
    clinical_range_min: 30,
    clinical_range_max: 100,
    optimal_range_min: 40,
    optimal_range_max: 80,
    risk_weight: 0.06,
    category: 'hormones',
    description: 'Essential hormone for bone health, immunity, and more',
    improvement_tips: ['Sun exposure', 'Vitamin D3 supplementation', 'Fatty fish consumption']
  },
  'thyroid_tsh': {
    name: 'TSH',
    unit: 'mIU/L',
    clinical_range_min: 0.4,
    clinical_range_max: 4.0,
    optimal_range_min: 0.5,
    optimal_range_max: 2.5,
    risk_weight: 0.07,
    category: 'hormones',
    description: 'Thyroid-stimulating hormone',
    improvement_tips: ['Iodine intake', 'Selenium', 'Stress management', 'Consult endocrinologist if abnormal']
  }
};

export class Biomarker implements IBiomarker {
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
  risk_weight: number;
  category: string;

  constructor(data: Partial<IBiomarker>) {
    this.biomarker_id = data.biomarker_id || uuidv4();
    this.user_id = data.user_id || '';
    this.name = data.name || '';
    this.value = data.value || 0;
    this.unit = data.unit || '';
    this.timestamp = data.timestamp || new Date();
    this.clinical_range_min = data.clinical_range_min || 0;
    this.clinical_range_max = data.clinical_range_max || 100;
    this.optimal_range_min = data.optimal_range_min || 0;
    this.optimal_range_max = data.optimal_range_max || 100;
    this.risk_weight = data.risk_weight || 0.1;
    this.category = data.category || 'general';
  }

  // Get risk level based on value
  get riskLevel(): RiskLevel {
    // Check if value is in optimal range
    if (this.value >= this.optimal_range_min && this.value <= this.optimal_range_max) {
      return RiskLevel.OPTIMAL;
    }

    // Check if value is in normal clinical range
    if (this.value >= this.clinical_range_min && this.value <= this.clinical_range_max) {
      // Calculate how far from optimal
      const optimalMid = (this.optimal_range_min + this.optimal_range_max) / 2;
      const deviation = Math.abs(this.value - optimalMid);
      const maxDeviation = Math.max(
        Math.abs(this.clinical_range_max - optimalMid),
        Math.abs(this.clinical_range_min - optimalMid)
      );
      const deviationRatio = deviation / maxDeviation;

      if (deviationRatio < 0.3) return RiskLevel.NORMAL;
      if (deviationRatio < 0.6) return RiskLevel.BORDERLINE;
      return RiskLevel.HIGH_RISK;
    }

    // Outside clinical range
    return RiskLevel.CRITICAL;
  }

  // Calculate deviation score (0-1, higher is worse)
  get deviationScore(): number {
    const optimalMid = (this.optimal_range_min + this.optimal_range_max) / 2;
    const optimalRange = this.optimal_range_max - this.optimal_range_min;

    if (this.value >= this.optimal_range_min && this.value <= this.optimal_range_max) {
      return 0;
    }

    const deviation = Math.abs(this.value - optimalMid);
    const normalizedDeviation = deviation / (optimalRange / 2);

    return Math.min(1, normalizedDeviation - 1);
  }

  // Save to database
  async save(): Promise<Biomarker> {
    const db = Database.getInstance();

    db.run(`
      INSERT OR REPLACE INTO biomarkers (
        biomarker_id, user_id, name, value, unit, timestamp,
        clinical_range_min, clinical_range_max,
        optimal_range_min, optimal_range_max,
        risk_weight, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.biomarker_id,
      this.user_id,
      this.name,
      this.value,
      this.unit,
      this.timestamp.toISOString(),
      this.clinical_range_min,
      this.clinical_range_max,
      this.optimal_range_min,
      this.optimal_range_max,
      this.risk_weight,
      this.category
    ]);

    return this;
  }

  // Find by ID
  static findById(biomarkerId: string): Biomarker | null {
    const db = Database.getInstance();
    const row = db.get<any>('SELECT * FROM biomarkers WHERE biomarker_id = ?', [biomarkerId]);

    if (!row) return null;
    return Biomarker.fromRow(row);
  }

  // Find all biomarkers for a user
  static findByUserId(userId: string): Biomarker[] {
    const db = Database.getInstance();
    const rows = db.all<any>(
      'SELECT * FROM biomarkers WHERE user_id = ? ORDER BY timestamp DESC',
      [userId]
    );

    return rows.map(row => Biomarker.fromRow(row));
  }

  // Find latest biomarker value by name for a user
  static findLatestByName(userId: string, name: string): Biomarker | null {
    const db = Database.getInstance();
    const row = db.get<any>(
      'SELECT * FROM biomarkers WHERE user_id = ? AND name = ? ORDER BY timestamp DESC LIMIT 1',
      [userId, name]
    );

    if (!row) return null;
    return Biomarker.fromRow(row);
  }

  // Find biomarker history by name for a user
  static findHistoryByName(userId: string, name: string, limit: number = 100): Biomarker[] {
    const db = Database.getInstance();
    const rows = db.all<any>(
      'SELECT * FROM biomarkers WHERE user_id = ? AND name = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, name, limit]
    );

    return rows.map(row => Biomarker.fromRow(row));
  }

  // Get all latest biomarkers for a user
  static getLatestForUser(userId: string): Biomarker[] {
    const db = Database.getInstance();
    const rows = db.all<any>(`
      SELECT b1.* FROM biomarkers b1
      INNER JOIN (
        SELECT name, MAX(timestamp) as max_ts
        FROM biomarkers
        WHERE user_id = ?
        GROUP BY name
      ) b2 ON b1.name = b2.name AND b1.timestamp = b2.max_ts
      WHERE b1.user_id = ?
    `, [userId, userId]);

    return rows.map(row => Biomarker.fromRow(row));
  }

  // Create from standard definition
  static createFromDefinition(
    userId: string,
    definitionKey: string,
    value: number
  ): Biomarker {
    const definition = BIOMARKER_DEFINITIONS[definitionKey];
    if (!definition) {
      throw new Error(`Unknown biomarker definition: ${definitionKey}`);
    }

    return new Biomarker({
      user_id: userId,
      name: definition.name,
      value,
      unit: definition.unit,
      clinical_range_min: definition.clinical_range_min,
      clinical_range_max: definition.clinical_range_max,
      optimal_range_min: definition.optimal_range_min,
      optimal_range_max: definition.optimal_range_max,
      risk_weight: definition.risk_weight,
      category: definition.category,
      timestamp: new Date()
    });
  }

  // Delete biomarker
  async delete(): Promise<void> {
    const db = Database.getInstance();
    db.run('DELETE FROM biomarkers WHERE biomarker_id = ?', [this.biomarker_id]);
  }

  // Convert database row to Biomarker
  private static fromRow(row: any): Biomarker {
    return new Biomarker({
      biomarker_id: row.biomarker_id,
      user_id: row.user_id,
      name: row.name,
      value: row.value,
      unit: row.unit,
      timestamp: new Date(row.timestamp),
      clinical_range_min: row.clinical_range_min,
      clinical_range_max: row.clinical_range_max,
      optimal_range_min: row.optimal_range_min,
      optimal_range_max: row.optimal_range_max,
      risk_weight: row.risk_weight,
      category: row.category
    });
  }

  // Get improvement tips
  getImprovementTips(): string[] {
    const definitionKey = Object.keys(BIOMARKER_DEFINITIONS).find(
      key => BIOMARKER_DEFINITIONS[key].name === this.name
    );

    if (definitionKey && BIOMARKER_DEFINITIONS[definitionKey]) {
      return BIOMARKER_DEFINITIONS[definitionKey].improvement_tips;
    }

    return [];
  }

  // Convert to JSON
  toJSON(): IBiomarker {
    return {
      biomarker_id: this.biomarker_id,
      user_id: this.user_id,
      name: this.name,
      value: this.value,
      unit: this.unit,
      timestamp: this.timestamp,
      clinical_range_min: this.clinical_range_min,
      clinical_range_max: this.clinical_range_max,
      optimal_range_min: this.optimal_range_min,
      optimal_range_max: this.optimal_range_max,
      risk_weight: this.risk_weight,
      category: this.category
    };
  }
}

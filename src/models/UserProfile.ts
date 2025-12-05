import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/Database';
import {
  IUserProfile,
  IMedicalHistory,
  ILifestyleFactors,
  Sex,
  ActivityLevel,
  DietType
} from './types';

export class UserProfile implements IUserProfile {
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

  constructor(data: Partial<IUserProfile>) {
    this.user_id = data.user_id || uuidv4();
    this.username = data.username || '';
    this.email = data.email || '';
    this.age = data.age || 0;
    this.sex = data.sex || Sex.OTHER;
    this.ethnicity = data.ethnicity;
    this.height_cm = data.height_cm || 0;
    this.weight_kg = data.weight_kg || 0;
    this.body_fat_percentage = data.body_fat_percentage;
    this.medical_history = data.medical_history;
    this.lifestyle_factors = data.lifestyle_factors || {
      sleep_avg_hours: 7,
      activity_level: ActivityLevel.MODERATELY_ACTIVE,
      diet_type: DietType.STANDARD,
      stress_score: 5,
      smoking_status: false,
      alcohol_drinks_per_week: 0
    };
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  // Calculate BMI
  get bmi(): number {
    if (this.height_cm <= 0) return 0;
    const heightM = this.height_cm / 100;
    return Math.round((this.weight_kg / (heightM * heightM)) * 10) / 10;
  }

  // Get BMI category
  get bmiCategory(): string {
    const bmi = this.bmi;
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  // Save to database
  async save(): Promise<UserProfile> {
    const db = Database.getInstance();
    this.updated_at = new Date();

    db.run(`
      INSERT OR REPLACE INTO user_profiles (
        user_id, username, email, age, sex, ethnicity,
        height_cm, weight_kg, body_fat_percentage,
        medical_history, lifestyle_factors,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this.user_id,
      this.username,
      this.email,
      this.age,
      this.sex,
      this.ethnicity || null,
      this.height_cm,
      this.weight_kg,
      this.body_fat_percentage || null,
      JSON.stringify(this.medical_history || {}),
      JSON.stringify(this.lifestyle_factors),
      this.created_at.toISOString(),
      this.updated_at.toISOString()
    ]);

    return this;
  }

  // Find by ID
  static findById(userId: string): UserProfile | null {
    const db = Database.getInstance();
    const row = db.get<any>('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

    if (!row) return null;

    return UserProfile.fromRow(row);
  }

  // Find by email
  static findByEmail(email: string): UserProfile | null {
    const db = Database.getInstance();
    const row = db.get<any>('SELECT * FROM user_profiles WHERE email = ?', [email]);

    if (!row) return null;

    return UserProfile.fromRow(row);
  }

  // Find all users
  static findAll(): UserProfile[] {
    const db = Database.getInstance();
    const rows = db.all<any>('SELECT * FROM user_profiles ORDER BY created_at DESC');

    return rows.map(row => UserProfile.fromRow(row));
  }

  // Delete user
  async delete(): Promise<void> {
    const db = Database.getInstance();
    db.run('DELETE FROM user_profiles WHERE user_id = ?', [this.user_id]);
  }

  // Convert database row to UserProfile
  private static fromRow(row: any): UserProfile {
    return new UserProfile({
      user_id: row.user_id,
      username: row.username,
      email: row.email,
      age: row.age,
      sex: row.sex as Sex,
      ethnicity: row.ethnicity,
      height_cm: row.height_cm,
      weight_kg: row.weight_kg,
      body_fat_percentage: row.body_fat_percentage,
      medical_history: JSON.parse(row.medical_history || '{}'),
      lifestyle_factors: JSON.parse(row.lifestyle_factors || '{}'),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    });
  }

  // Update lifestyle factors
  updateLifestyleFactors(factors: Partial<ILifestyleFactors>): void {
    this.lifestyle_factors = {
      ...this.lifestyle_factors,
      ...factors
    };
    this.updated_at = new Date();
  }

  // Update medical history
  updateMedicalHistory(history: Partial<IMedicalHistory>): void {
    this.medical_history = {
      ...this.medical_history,
      conditions: [],
      medications: [],
      allergies: [],
      family_history: [],
      surgeries: [],
      ...history
    };
    this.updated_at = new Date();
  }

  // Convert to JSON
  toJSON(): IUserProfile {
    return {
      user_id: this.user_id,
      username: this.username,
      email: this.email,
      age: this.age,
      sex: this.sex,
      ethnicity: this.ethnicity,
      height_cm: this.height_cm,
      weight_kg: this.weight_kg,
      body_fat_percentage: this.body_fat_percentage,
      medical_history: this.medical_history,
      lifestyle_factors: this.lifestyle_factors,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

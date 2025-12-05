/**
 * Validation utilities for Lifespan+ application
 */

import { Sex, ActivityLevel, DietType, HabitType, HabitFrequency } from '../models/types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate user profile data
 */
export function validateUserProfile(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.username || typeof data.username !== 'string' || data.username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.age || typeof data.age !== 'number' || data.age < 18 || data.age > 120) {
    errors.push('Age must be between 18 and 120');
  }

  if (!data.sex || !Object.values(Sex).includes(data.sex)) {
    errors.push('Valid sex is required (male, female, other)');
  }

  if (!data.height_cm || typeof data.height_cm !== 'number' || data.height_cm < 100 || data.height_cm > 250) {
    errors.push('Height must be between 100 and 250 cm');
  }

  if (!data.weight_kg || typeof data.weight_kg !== 'number' || data.weight_kg < 30 || data.weight_kg > 300) {
    errors.push('Weight must be between 30 and 300 kg');
  }

  if (data.body_fat_percentage !== undefined) {
    if (typeof data.body_fat_percentage !== 'number' || data.body_fat_percentage < 3 || data.body_fat_percentage > 60) {
      errors.push('Body fat percentage must be between 3 and 60');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate lifestyle factors
 */
export function validateLifestyleFactors(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.sleep_avg_hours !== undefined) {
    if (typeof data.sleep_avg_hours !== 'number' || data.sleep_avg_hours < 0 || data.sleep_avg_hours > 24) {
      errors.push('Sleep hours must be between 0 and 24');
    }
  }

  if (data.activity_level !== undefined && !Object.values(ActivityLevel).includes(data.activity_level)) {
    errors.push('Invalid activity level');
  }

  if (data.diet_type !== undefined && !Object.values(DietType).includes(data.diet_type)) {
    errors.push('Invalid diet type');
  }

  if (data.stress_score !== undefined) {
    if (typeof data.stress_score !== 'number' || data.stress_score < 1 || data.stress_score > 10) {
      errors.push('Stress score must be between 1 and 10');
    }
  }

  if (data.alcohol_drinks_per_week !== undefined) {
    if (typeof data.alcohol_drinks_per_week !== 'number' || data.alcohol_drinks_per_week < 0) {
      errors.push('Alcohol drinks per week must be non-negative');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate biomarker data
 */
export function validateBiomarker(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.biomarker_key && !data.name) {
    errors.push('Biomarker key or name is required');
  }

  if (data.value === undefined || typeof data.value !== 'number') {
    errors.push('Numeric value is required');
  }

  if (data.timestamp) {
    const date = new Date(data.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('Invalid timestamp format');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate custom biomarker data
 */
export function validateCustomBiomarker(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Biomarker name is required');
  }

  if (data.value === undefined || typeof data.value !== 'number') {
    errors.push('Numeric value is required');
  }

  if (!data.unit || typeof data.unit !== 'string') {
    errors.push('Unit is required');
  }

  if (data.clinical_range_min === undefined || typeof data.clinical_range_min !== 'number') {
    errors.push('Clinical range minimum is required');
  }

  if (data.clinical_range_max === undefined || typeof data.clinical_range_max !== 'number') {
    errors.push('Clinical range maximum is required');
  }

  if (data.clinical_range_min >= data.clinical_range_max) {
    errors.push('Clinical range minimum must be less than maximum');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate habit data
 */
export function validateHabit(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Habit name is required');
  }

  if (data.type !== undefined && !Object.values(HabitType).includes(data.type)) {
    errors.push('Invalid habit type');
  }

  if (data.frequency !== undefined && !Object.values(HabitFrequency).includes(data.frequency)) {
    errors.push('Invalid habit frequency');
  }

  if (data.target_value !== undefined) {
    if (typeof data.target_value !== 'number' || data.target_value <= 0) {
      errors.push('Target value must be a positive number');
    }
  }

  if (data.points_per_completion !== undefined) {
    if (typeof data.points_per_completion !== 'number' || data.points_per_completion < 0) {
      errors.push('Points per completion must be non-negative');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate points transaction
 */
export function validatePointsTransaction(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.amount === undefined || typeof data.amount !== 'number') {
    errors.push('Amount is required');
  }

  if (!data.reason || typeof data.reason !== 'string') {
    errors.push('Reason is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Email validation helper
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string input
 */
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

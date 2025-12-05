import { Request, Response } from 'express';
import { UserProfile } from '../models/UserProfile';
import { Points } from '../models/Points';
import { IApiResponse, IUserProfile, ILifestyleFactors, IMedicalHistory, Sex } from '../models/types';

export class ProfileController {
  // Create new user profile
  static async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const {
        username,
        email,
        age,
        sex,
        ethnicity,
        height_cm,
        weight_kg,
        body_fat_percentage,
        lifestyle_factors,
        medical_history
      } = req.body;

      // Validate required fields
      if (!username || !email || !age || !sex || !height_cm || !weight_kg) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Missing required fields: username, email, age, sex, height_cm, weight_kg'
        };
        res.status(400).json(response);
        return;
      }

      // Check if username or email already exists
      const existingByEmail = UserProfile.findByEmail(email);
      if (existingByEmail) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'Email already registered'
        };
        res.status(409).json(response);
        return;
      }

      // Create user profile
      const profile = new UserProfile({
        username,
        email,
        age,
        sex: sex as Sex,
        ethnicity,
        height_cm,
        weight_kg,
        body_fat_percentage,
        lifestyle_factors,
        medical_history
      });

      await profile.save();

      // Initialize points for user
      const points = new Points({ user_id: profile.user_id });
      await points.save();

      const response: IApiResponse<IUserProfile> = {
        success: true,
        data: profile.toJSON(),
        message: 'Profile created successfully'
      };
      res.status(201).json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create profile'
      };
      res.status(500).json(response);
    }
  }

  // Get user profile by ID
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const profile = UserProfile.findById(userId);
      if (!profile) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: IApiResponse<IUserProfile> = {
        success: true,
        data: profile.toJSON()
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch profile'
      };
      res.status(500).json(response);
    }
  }

  // Update user profile
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const updates = req.body;

      const profile = UserProfile.findById(userId);
      if (!profile) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      // Apply updates
      if (updates.username) profile.username = updates.username;
      if (updates.age) profile.age = updates.age;
      if (updates.height_cm) profile.height_cm = updates.height_cm;
      if (updates.weight_kg) profile.weight_kg = updates.weight_kg;
      if (updates.body_fat_percentage !== undefined) {
        profile.body_fat_percentage = updates.body_fat_percentage;
      }
      if (updates.ethnicity) profile.ethnicity = updates.ethnicity;

      await profile.save();

      const response: IApiResponse<IUserProfile> = {
        success: true,
        data: profile.toJSON(),
        message: 'Profile updated successfully'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile'
      };
      res.status(500).json(response);
    }
  }

  // Update lifestyle factors
  static async updateLifestyleFactors(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const lifestyleUpdates: Partial<ILifestyleFactors> = req.body;

      const profile = UserProfile.findById(userId);
      if (!profile) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      profile.updateLifestyleFactors(lifestyleUpdates);
      await profile.save();

      const response: IApiResponse<ILifestyleFactors> = {
        success: true,
        data: profile.lifestyle_factors,
        message: 'Lifestyle factors updated successfully'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update lifestyle factors'
      };
      res.status(500).json(response);
    }
  }

  // Update medical history
  static async updateMedicalHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const medicalUpdates: Partial<IMedicalHistory> = req.body;

      const profile = UserProfile.findById(userId);
      if (!profile) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      profile.updateMedicalHistory(medicalUpdates);
      await profile.save();

      const response: IApiResponse<IMedicalHistory> = {
        success: true,
        data: profile.medical_history,
        message: 'Medical history updated successfully'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update medical history'
      };
      res.status(500).json(response);
    }
  }

  // Delete user profile
  static async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const profile = UserProfile.findById(userId);
      if (!profile) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      await profile.delete();

      const response: IApiResponse<null> = {
        success: true,
        message: 'Profile deleted successfully'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete profile'
      };
      res.status(500).json(response);
    }
  }

  // Get user stats (BMI, etc.)
  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const profile = UserProfile.findById(userId);
      if (!profile) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      const stats = {
        bmi: profile.bmi,
        bmi_category: profile.bmiCategory,
        age: profile.age,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        body_fat_percentage: profile.body_fat_percentage,
        lifestyle_factors: profile.lifestyle_factors
      };

      const response: IApiResponse<typeof stats> = {
        success: true,
        data: stats
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user stats'
      };
      res.status(500).json(response);
    }
  }

  // Onboarding completion
  static async completeOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { goals, preferences } = req.body;

      const profile = UserProfile.findById(userId);
      if (!profile) {
        const response: IApiResponse<null> = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      // Award points for completing onboarding
      const points = await Points.getOrCreate(userId);
      await points.addPoints(100, 'Completed onboarding', 'onboarding');

      const response: IApiResponse<{ profile: IUserProfile; points_earned: number }> = {
        success: true,
        data: {
          profile: profile.toJSON(),
          points_earned: 100
        },
        message: 'Onboarding completed! You earned 100 points!'
      };
      res.json(response);
    } catch (error) {
      const response: IApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete onboarding'
      };
      res.status(500).json(response);
    }
  }
}

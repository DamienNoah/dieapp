import { Biomarker, BIOMARKER_DEFINITIONS } from '../models/Biomarker';
import { Habit, HabitLog } from '../models/Habit';
import { HabitType } from '../models/types';

/**
 * Service for integrating with wearable devices and health platforms
 * This is a mock/placeholder implementation - real integration would require
 * OAuth flows and API calls to Garmin, Oura, Apple Health, etc.
 */

export interface WearableDataPoint {
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
  source: string;
}

export interface WearableProvider {
  name: string;
  connected: boolean;
  lastSync?: Date;
  availableMetrics: string[];
}

// Mock wearable data for demonstration
const MOCK_PROVIDERS: WearableProvider[] = [
  {
    name: 'Apple Health',
    connected: false,
    availableMetrics: ['hrv', 'resting_heart_rate', 'steps', 'sleep', 'vo2_max', 'active_energy']
  },
  {
    name: 'Garmin',
    connected: false,
    availableMetrics: ['hrv', 'resting_heart_rate', 'steps', 'sleep', 'vo2_max', 'stress', 'body_battery']
  },
  {
    name: 'Oura Ring',
    connected: false,
    availableMetrics: ['hrv', 'resting_heart_rate', 'sleep', 'readiness', 'activity_score']
  },
  {
    name: 'Whoop',
    connected: false,
    availableMetrics: ['hrv', 'resting_heart_rate', 'sleep', 'strain', 'recovery']
  },
  {
    name: 'Fitbit',
    connected: false,
    availableMetrics: ['hrv', 'resting_heart_rate', 'steps', 'sleep', 'active_zone_minutes']
  }
];

export class WearableIntegrationService {
  private static connectedProviders: Map<string, WearableProvider> = new Map();

  /**
   * Get available wearable providers
   */
  static getAvailableProviders(): WearableProvider[] {
    return MOCK_PROVIDERS.map(provider => ({
      ...provider,
      connected: this.connectedProviders.has(provider.name)
    }));
  }

  /**
   * Connect to a wearable provider (mock)
   * In real implementation, this would initiate OAuth flow
   */
  static async connectProvider(providerName: string, authCode?: string): Promise<{ success: boolean; message: string }> {
    const provider = MOCK_PROVIDERS.find(p => p.name === providerName);

    if (!provider) {
      return { success: false, message: `Unknown provider: ${providerName}` };
    }

    // Mock successful connection
    this.connectedProviders.set(providerName, {
      ...provider,
      connected: true,
      lastSync: new Date()
    });

    return { success: true, message: `Successfully connected to ${providerName}` };
  }

  /**
   * Disconnect from a wearable provider
   */
  static disconnectProvider(providerName: string): { success: boolean; message: string } {
    if (!this.connectedProviders.has(providerName)) {
      return { success: false, message: `Provider ${providerName} is not connected` };
    }

    this.connectedProviders.delete(providerName);
    return { success: true, message: `Disconnected from ${providerName}` };
  }

  /**
   * Sync data from connected wearables (mock)
   * Returns mock data - real implementation would fetch from APIs
   */
  static async syncData(userId: string): Promise<WearableDataPoint[]> {
    const dataPoints: WearableDataPoint[] = [];

    for (const [providerName, provider] of this.connectedProviders) {
      // Generate mock data for each connected provider
      const mockData = this.generateMockData(providerName, provider.availableMetrics);
      dataPoints.push(...mockData);
    }

    return dataPoints;
  }

  /**
   * Generate mock wearable data
   */
  private static generateMockData(source: string, metrics: string[]): WearableDataPoint[] {
    const data: WearableDataPoint[] = [];
    const now = new Date();

    for (const metric of metrics) {
      switch (metric) {
        case 'hrv':
          data.push({
            metric: 'hrv',
            value: 45 + Math.random() * 30,
            unit: 'ms',
            timestamp: now,
            source
          });
          break;
        case 'resting_heart_rate':
          data.push({
            metric: 'resting_heart_rate',
            value: 55 + Math.random() * 15,
            unit: 'bpm',
            timestamp: now,
            source
          });
          break;
        case 'steps':
          data.push({
            metric: 'steps',
            value: Math.floor(5000 + Math.random() * 10000),
            unit: 'steps',
            timestamp: now,
            source
          });
          break;
        case 'sleep':
          data.push({
            metric: 'sleep',
            value: 6 + Math.random() * 3,
            unit: 'hours',
            timestamp: now,
            source
          });
          break;
        case 'vo2_max':
          data.push({
            metric: 'vo2_max',
            value: 35 + Math.random() * 20,
            unit: 'mL/kg/min',
            timestamp: now,
            source
          });
          break;
      }
    }

    return data;
  }

  /**
   * Import wearable data into biomarkers
   */
  static async importToBiomarkers(userId: string, dataPoints: WearableDataPoint[]): Promise<Biomarker[]> {
    const imported: Biomarker[] = [];

    for (const point of dataPoints) {
      // Map wearable metric to biomarker definition
      const biomarkerKey = this.mapMetricToBiomarker(point.metric);
      if (biomarkerKey && BIOMARKER_DEFINITIONS[biomarkerKey]) {
        const biomarker = Biomarker.createFromDefinition(userId, biomarkerKey, point.value);
        biomarker.timestamp = point.timestamp;
        await biomarker.save();
        imported.push(biomarker);
      }
    }

    return imported;
  }

  /**
   * Auto-complete habits based on wearable data
   */
  static async autoCompleteHabits(userId: string, dataPoints: WearableDataPoint[]): Promise<HabitLog[]> {
    const completedLogs: HabitLog[] = [];
    const habits = Habit.findByUserId(userId);

    for (const habit of habits) {
      const relevantData = dataPoints.find(d => this.isRelevantForHabit(d.metric, habit.type));

      if (relevantData && !habit.isCompletedToday()) {
        const meetsTarget = this.checkHabitTarget(habit, relevantData);
        if (meetsTarget) {
          const log = await habit.logCompletion(true, relevantData.value, `Auto-completed via ${relevantData.source}`);
          completedLogs.push(log);
        }
      }
    }

    return completedLogs;
  }

  /**
   * Map wearable metric to biomarker key
   */
  private static mapMetricToBiomarker(metric: string): string | null {
    const mapping: Record<string, string> = {
      'hrv': 'hrv',
      'resting_heart_rate': 'resting_heart_rate',
      'vo2_max': 'vo2_max'
    };

    return mapping[metric] || null;
  }

  /**
   * Check if metric is relevant for habit type
   */
  private static isRelevantForHabit(metric: string, habitType: HabitType): boolean {
    const mapping: Record<string, HabitType[]> = {
      'steps': [HabitType.WALKING, HabitType.EXERCISE],
      'sleep': [HabitType.SLEEP],
      'active_energy': [HabitType.EXERCISE, HabitType.ZONE_2_CARDIO]
    };

    return mapping[metric]?.includes(habitType) || false;
  }

  /**
   * Check if habit target is met by data
   */
  private static checkHabitTarget(habit: Habit, data: WearableDataPoint): boolean {
    // Simplified check - real implementation would be more sophisticated
    if (habit.type === HabitType.WALKING && data.metric === 'steps') {
      return data.value >= habit.target_value;
    }
    if (habit.type === HabitType.SLEEP && data.metric === 'sleep') {
      return data.value >= habit.target_value;
    }
    return false;
  }

  /**
   * Get sync status for all providers
   */
  static getSyncStatus(): { provider: string; connected: boolean; lastSync: Date | null }[] {
    return MOCK_PROVIDERS.map(provider => ({
      provider: provider.name,
      connected: this.connectedProviders.has(provider.name),
      lastSync: this.connectedProviders.get(provider.name)?.lastSync || null
    }));
  }
}

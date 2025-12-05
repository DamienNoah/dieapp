import { Biomarker, BIOMARKER_DEFINITIONS } from '../models/Biomarker';
import { RiskLevel } from '../models/types';

/**
 * Interfaces for biomarker views
 */
export interface BiomarkerCard {
  biomarker_id: string;
  name: string;
  current_value: number;
  unit: string;
  risk_level: RiskLevel;
  risk_color: string;
  optimal_range: string;
  clinical_range: string;
  trend: 'improving' | 'stable' | 'declining';
  trend_percentage: number | null;
  category: string;
  last_updated: Date;
  improvement_tips: string[];
}

export interface BiomarkerTrendChart {
  name: string;
  unit: string;
  data_points: { date: string; value: number }[];
  optimal_min: number;
  optimal_max: number;
  clinical_min: number;
  clinical_max: number;
  average: number;
  trend_direction: 'improving' | 'stable' | 'declining';
}

export interface CategorySummary {
  category: string;
  category_display: string;
  total_biomarkers: number;
  optimal_count: number;
  at_risk_count: number;
  overall_status: 'excellent' | 'good' | 'fair' | 'needs_attention';
  biomarkers: BiomarkerCard[];
}

/**
 * Biomarker View - Formats biomarker data for different UI components
 */
export class BiomarkerView {
  /**
   * Get biomarker cards for the main biomarker list view
   */
  static getBiomarkerCards(userId: string): BiomarkerCard[] {
    const biomarkers = Biomarker.getLatestForUser(userId);
    return biomarkers.map(b => this.formatBiomarkerCard(userId, b));
  }

  /**
   * Format a single biomarker as a card
   */
  private static formatBiomarkerCard(userId: string, biomarker: Biomarker): BiomarkerCard {
    // Get history for trend
    const history = Biomarker.findHistoryByName(userId, biomarker.name, 5);
    const { trend, trendPercentage } = this.calculateTrend(biomarker, history);

    return {
      biomarker_id: biomarker.biomarker_id,
      name: biomarker.name,
      current_value: biomarker.value,
      unit: biomarker.unit,
      risk_level: biomarker.riskLevel,
      risk_color: this.getRiskColor(biomarker.riskLevel),
      optimal_range: `${biomarker.optimal_range_min} - ${biomarker.optimal_range_max}`,
      clinical_range: `${biomarker.clinical_range_min} - ${biomarker.clinical_range_max}`,
      trend,
      trend_percentage: trendPercentage,
      category: biomarker.category,
      last_updated: biomarker.timestamp,
      improvement_tips: biomarker.getImprovementTips()
    };
  }

  /**
   * Get trend data for a specific biomarker
   */
  static getBiomarkerTrend(userId: string, biomarkerName: string, days: number = 90): BiomarkerTrendChart | null {
    const history = Biomarker.findHistoryByName(userId, biomarkerName, 100);

    if (history.length === 0) return null;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filteredHistory = history.filter(b => b.timestamp >= cutoffDate);
    if (filteredHistory.length === 0) return null;

    const latest = filteredHistory[0];
    const values = filteredHistory.map(b => b.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;

    const { trend } = this.calculateTrend(latest, filteredHistory);

    return {
      name: latest.name,
      unit: latest.unit,
      data_points: filteredHistory
        .map(b => ({
          date: b.timestamp.toISOString().split('T')[0],
          value: b.value
        }))
        .reverse(),
      optimal_min: latest.optimal_range_min,
      optimal_max: latest.optimal_range_max,
      clinical_min: latest.clinical_range_min,
      clinical_max: latest.clinical_range_max,
      average: Math.round(average * 100) / 100,
      trend_direction: trend
    };
  }

  /**
   * Get biomarkers grouped by category
   */
  static getBiomarkersByCategory(userId: string): CategorySummary[] {
    const biomarkers = Biomarker.getLatestForUser(userId);
    const categories = new Map<string, Biomarker[]>();

    // Group by category
    for (const biomarker of biomarkers) {
      const existing = categories.get(biomarker.category) || [];
      existing.push(biomarker);
      categories.set(biomarker.category, existing);
    }

    // Format each category
    const summaries: CategorySummary[] = [];
    for (const [category, categoryBiomarkers] of categories) {
      const cards = categoryBiomarkers.map(b => this.formatBiomarkerCard(userId, b));
      const optimalCount = cards.filter(c => c.risk_level === RiskLevel.OPTIMAL).length;
      const atRiskCount = cards.filter(c =>
        c.risk_level === RiskLevel.HIGH_RISK || c.risk_level === RiskLevel.CRITICAL
      ).length;

      let overallStatus: 'excellent' | 'good' | 'fair' | 'needs_attention' = 'good';
      if (atRiskCount > 0) {
        overallStatus = atRiskCount >= categoryBiomarkers.length / 2 ? 'needs_attention' : 'fair';
      } else if (optimalCount === categoryBiomarkers.length) {
        overallStatus = 'excellent';
      }

      summaries.push({
        category,
        category_display: this.formatCategoryName(category),
        total_biomarkers: categoryBiomarkers.length,
        optimal_count: optimalCount,
        at_risk_count: atRiskCount,
        overall_status: overallStatus,
        biomarkers: cards
      });
    }

    return summaries;
  }

  /**
   * Get available biomarker definitions for adding new biomarkers
   */
  static getAvailableDefinitions(category?: string): typeof BIOMARKER_DEFINITIONS {
    if (category) {
      const filtered: Record<string, typeof BIOMARKER_DEFINITIONS[string]> = {};
      for (const [key, def] of Object.entries(BIOMARKER_DEFINITIONS)) {
        if (def.category === category) {
          filtered[key] = def;
        }
      }
      return filtered;
    }
    return BIOMARKER_DEFINITIONS;
  }

  /**
   * Get biomarker impact visualization data
   */
  static getBiomarkerImpactData(userId: string): {
    name: string;
    impact_years: number;
    risk_level: RiskLevel;
    category: string;
  }[] {
    const biomarkers = Biomarker.getLatestForUser(userId);

    return biomarkers.map(b => {
      const impactYears = b.deviationScore * b.risk_weight * 5;
      return {
        name: b.name,
        impact_years: Math.round(impactYears * 10) / 10,
        risk_level: b.riskLevel,
        category: b.category
      };
    }).sort((a, b) => Math.abs(b.impact_years) - Math.abs(a.impact_years));
  }

  /**
   * Calculate trend from history
   */
  private static calculateTrend(
    current: Biomarker,
    history: Biomarker[]
  ): { trend: 'improving' | 'stable' | 'declining'; trendPercentage: number | null } {
    if (history.length < 2) {
      return { trend: 'stable', trendPercentage: null };
    }

    const previous = history[1];
    const change = current.value - previous.value;
    const percentChange = (change / previous.value) * 100;

    // Determine if higher or lower is better
    const lowerIsBetter = current.optimal_range_max < current.clinical_range_max;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (Math.abs(percentChange) > 5) {
      if (lowerIsBetter) {
        trend = change < 0 ? 'improving' : 'declining';
      } else {
        trend = change > 0 ? 'improving' : 'declining';
      }
    }

    return {
      trend,
      trendPercentage: Math.round(percentChange * 10) / 10
    };
  }

  /**
   * Get color for risk level
   */
  private static getRiskColor(riskLevel: RiskLevel): string {
    const colors: Record<RiskLevel, string> = {
      [RiskLevel.OPTIMAL]: '#22c55e', // Green
      [RiskLevel.NORMAL]: '#84cc16', // Lime
      [RiskLevel.BORDERLINE]: '#eab308', // Yellow
      [RiskLevel.HIGH_RISK]: '#f97316', // Orange
      [RiskLevel.CRITICAL]: '#ef4444' // Red
    };
    return colors[riskLevel];
  }

  /**
   * Format category name for display
   */
  private static formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

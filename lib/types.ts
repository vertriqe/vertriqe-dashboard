/**
 * Shared types across the application
 */

export interface SensorData {
  timestamp: number
  value: number
}

export type SensorType = 'cumulative' | 'instant' | 'accumulated'

export interface EnergyMetrics {
  totalUsage: number
  totalCost: number
  averageUsage: number
  peakUsage: number
  savingsPercentage?: number
  carbonEmissions?: number
}

export interface UserInfo {
  name: string
  email: string
  password?: string
}

export const SITE_MAPPING: Record<string, string> = {
  "The Hunt": "hunt",
  "Weave Studio": "weave",
  "About Coffee Jeju": "coffee",
  "TNL": "tnl",
  "Telstar Office": "telstar_office",
}

export const REVERSE_SITE_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(SITE_MAPPING).map(([key, value]) => [value, key])
)

export interface BaselineData {
  timestamp: number
  value: number
}

export type Baseline = BaselineData[] | null

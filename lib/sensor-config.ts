// Centralized sensor configuration for all users

export interface SensorConfig {
  key: string
  name: string
  type: 'instant' | 'accumulated' | 'cumulative'
  owner: string
  description?: string
}

// Weave Studio sensor configurations
export const WEAVE_SENSORS: SensorConfig[] = [
  {
    key: "vertriqe_25247_weave",
    name: "AC 1 - Instant Energy",
    type: "instant",
    owner: "Weave Studio",
    description: "Air conditioner 1 instant power consumption"
  },
  {
    key: "vertriqe_25248_weave",
    name: "AC 2 - Instant Energy",
    type: "instant", 
    owner: "Weave Studio",
    description: "Air conditioner 2 instant power consumption"
  },
  {
    key: "vertriqe_25245_weave",
    name: "Combined - Instant Energy",
    type: "instant",
    owner: "Weave Studio", 
    description: "Combined instant power consumption"
  },
  {
    key: "weave_ac1_accumulated",
    name: "AC 1 - Accumulated Energy",
    type: "accumulated",
    owner: "Weave Studio",
    description: "Air conditioner 1 accumulated energy consumption"
  },
  {
    key: "weave_ac2_accumulated", 
    name: "AC 2 - Accumulated Energy",
    type: "accumulated",
    owner: "Weave Studio",
    description: "Air conditioner 2 accumulated energy consumption"
  },
  {
    key: "weave_combined_accumulated",
    name: "Combined - Accumulated Energy", 
    type: "accumulated",
    owner: "Weave Studio",
    description: "Combined accumulated energy consumption"
  }
]

// The Hunt sensor configurations
export const HUNT_SENSORS: SensorConfig[] = [
  {
    key: "vertriqe_25120_cctp",
    name: "Area 1 - Total Energy (25120)",
    type: "cumulative",
    owner: "The Hunt",
    description: "Area 1 cumulative energy consumption"
  },
  {
    key: "vertriqe_25120_cttp", 
    name: "Area 1 - Instant Energy (25120)",
    type: "instant",
    owner: "The Hunt",
    description: "Area 1 instant power consumption"
  },
  {
    key: "vertriqe_25121_cctp",
    name: "Area 2 - Total Energy (25121)",
    type: "cumulative", 
    owner: "The Hunt",
    description: "Area 2 cumulative energy consumption"
  },
  {
    key: "vertriqe_25121_cttp",
    name: "Area 2 - Instant Energy (25121)",
    type: "instant",
    owner: "The Hunt", 
    description: "Area 2 instant power consumption"
  },
  {
    key: "vertriqe_25122_cctp",
    name: "Area 3 - Total Energy (25122)",
    type: "cumulative",
    owner: "The Hunt",
    description: "Area 3 cumulative energy consumption"
  },
  {
    key: "vertriqe_25122_cttp",
    name: "Area 3 - Instant Energy (25122)",
    type: "instant", 
    owner: "The Hunt",
    description: "Area 3 instant power consumption"
  },
  {
    key: "vertriqe_25123_cctp",
    name: "Area 4 - Total Energy (25123)",
    type: "cumulative",
    owner: "The Hunt",
    description: "Area 4 cumulative energy consumption"
  },
  {
    key: "vertriqe_25123_cttp",
    name: "Area 4 - Instant Energy (25123)", 
    type: "instant",
    owner: "The Hunt",
    description: "Area 4 instant power consumption"
  },
  {
    key: "vertriqe_25124_cctp",
    name: "Area 5 - Total Energy (25124)",
    type: "cumulative",
    owner: "The Hunt",
    description: "Area 5 cumulative energy consumption"
  },
  {
    key: "vertriqe_25124_cttp",
    name: "Area 5 - Instant Energy (25124)",
    type: "instant",
    owner: "The Hunt",
    description: "Area 5 instant power consumption"
  }
]

// Hai Sang sensor configurations
export const HAI_SANG_SENSORS: SensorConfig[] = [
  {
    key: "vertriqe_24833_cttp",
    name: "Hai Sang Cold Room Power Consumption",
    type: "instant", 
    owner: "Hai Sang",
    description: "Cold room power consumption"
  },
  {
    key: "vertriqe_24836_temp2",
    name: "Hai Sang Cold Room Temperature",
    type: "instant",
    owner: "Hai Sang", 
    description: "Cold room temperature sensor"
  }
]

// Combined sensor configurations
export const ALL_SENSORS = [...WEAVE_SENSORS, ...HUNT_SENSORS, ...HAI_SANG_SENSORS]

// Utility functions
export function getSensorsByOwner(owner: string): SensorConfig[] {
  return ALL_SENSORS.filter(sensor => sensor.owner === owner)
}

export function getSensorsByType(type: SensorConfig['type']): SensorConfig[] {
  return ALL_SENSORS.filter(sensor => sensor.type === type)
}

export function getSensorByKey(key: string): SensorConfig | undefined {
  return ALL_SENSORS.find(sensor => sensor.key === key)
}

export function getWeaveSensorKeys(): string[] {
  return WEAVE_SENSORS.map(sensor => sensor.key)
}

export function getWeaveDashboardSensors(): string[] {
  // Return only the instant energy sensors for dashboard aggregation
  return WEAVE_SENSORS
    .filter(sensor => sensor.type === 'instant' && !sensor.key.includes('accumulated'))
    .map(sensor => sensor.key)
}

export function getHuntCumulativeSensors(): string[] {
  return HUNT_SENSORS
    .filter(sensor => sensor.type === 'cumulative')
    .map(sensor => sensor.key)
}

// Mapping for accumulated sensors to their actual sensor keys (for Weave Studio) weave = cttp
export const ACCUMULATED_SENSOR_MAPPING: Record<string, string> = {
  'weave_ac1_accumulated': 'vertriqe_25247_weave',
  'weave_ac2_accumulated': 'vertriqe_25248_weave', 
  'weave_combined_accumulated': 'vertriqe_25245_weave'
}
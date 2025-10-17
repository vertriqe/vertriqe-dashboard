// Centralized sensor configuration for all users

export interface SensorConfig {
  key: string
  name: string
  type: 'instant' | 'accumulated' | 'cumulative'
  owner: string
  description?: string
}

export interface ZoneSensor {
  id: number
  name: string
  tempSensor: string
  humSensor: string
  savingModeEnabled: boolean
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

// About Coffee Jeju sensor configurations
export const ABOUT_COFFEE_SENSORS: SensorConfig[] = [
  // AC Controller temperature sensors for floor 1
  { key: "vertriqe_25327_temperature", name: "1-1 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 1 Area 1 AC temperature" },
  { key: "vertriqe_25331_temperature", name: "1-2 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 1 Area 2 AC temperature" },
  { key: "vertriqe_25329_temperature", name: "1-3 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 1 Area 3 AC temperature" },
  { key: "vertriqe_25328_temperature", name: "1-4 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 1 Area 4 AC temperature" },
  { key: "vertriqe_25333_temperature", name: "1-5 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 1 Area 5 AC temperature" },
  { key: "vertriqe_25330_temperature", name: "1-6 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 1 Area 6 AC temperature" },
  { key: "vertriqe_25332_temperature", name: "1-7 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 1 Area 7 AC temperature" },
  // AC Controller temperature sensors for floor 2
  { key: "vertriqe_25405_temperature", name: "2-1 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 1 AC temperature" },
  { key: "vertriqe_25403_temperature", name: "2-2 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 2 AC temperature" },
  { key: "vertriqe_25404_temperature", name: "2-3 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 3 AC temperature" },
  { key: "vertriqe_25402_temperature", name: "2-4 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 4 AC temperature" },
  { key: "vertriqe_25401_temperature", name: "2-5 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 5 AC temperature" },
  { key: "vertriqe_25400_temperature", name: "2-6 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 6 AC temperature" },
  { key: "vertriqe_25322_temperature", name: "2-7 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 7 AC temperature" },
  { key: "vertriqe_25326_temperature", name: "2-8 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 8 AC temperature" },
  { key: "vertriqe_25321_temperature", name: "2-9 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 9 AC temperature" },
  { key: "vertriqe_25323_temperature", name: "2-10 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 10 AC temperature" },
  { key: "vertriqe_25324_temperature", name: "2-11 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 11 AC temperature" },
  { key: "vertriqe_25325_temperature", name: "2-12 AC Temperature", type: "instant", owner: "About Coffee Jeju", description: "Floor 2 Area 12 AC temperature" },
]

// Zone sensor configurations for management
export const WEAVE_ZONES: ZoneSensor[] = [
  {
    id: 1,
    name: "AC 1",
    tempSensor: "vertriqe_25245_amb_temp",
    humSensor: "vertriqe_25245_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 2,
    name: "AC 2",
    tempSensor: "vertriqe_25247_amb_temp",
    humSensor: "vertriqe_25247_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 3,
    name: "Combined",
    tempSensor: "vertriqe_25248_amb_temp",
    humSensor: "vertriqe_25248_amb_hum",
    savingModeEnabled: false,
  }
]

export const HUNT_ZONES: ZoneSensor[] = [
  {
    id: 1,
    name: "Area 1",
    tempSensor: "vertriqe_25114_amb_temp",
    humSensor: "vertriqe_25114_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 2,
    name: "Area 2",
    tempSensor: "vertriqe_25115_amb_temp",
    humSensor: "vertriqe_25115_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 3,
    name: "Area 3",
    tempSensor: "vertriqe_25116_amb_temp",
    humSensor: "vertriqe_25116_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 4,
    name: "Area 4",
    tempSensor: "vertriqe_25117_amb_temp",
    humSensor: "vertriqe_25117_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 5,
    name: "Area 5",
    tempSensor: "vertriqe_25118_amb_temp",
    humSensor: "vertriqe_25118_amb_hum",
    savingModeEnabled: false,
  }
]

export const ABOUT_COFFEE_ZONES: ZoneSensor[] = [
  {
    id: 1,
    name: "1-1",
    tempSensor: "vertriqe_25335_amb_temp",
    humSensor: "vertriqe_25335_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 2,
    name: "1-2",
    tempSensor: "vertriqe_25336_amb_temp",
    humSensor: "vertriqe_25336_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 3,
    name: "1-3",
    tempSensor: "vertriqe_25337_amb_temp",
    humSensor: "vertriqe_25337_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 4,
    name: "1-4",
    tempSensor: "vertriqe_25338_amb_temp",
    humSensor: "vertriqe_25338_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 5,
    name: "1-5",
    tempSensor: "vertriqe_25339_amb_temp",
    humSensor: "vertriqe_25339_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 6,
    name: "1-6",
    tempSensor: "vertriqe_25340_amb_temp",
    humSensor: "vertriqe_25340_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 7,
    name: "1-7",
    tempSensor: "vertriqe_25341_amb_temp",
    humSensor: "vertriqe_25341_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 8,
    name: "2-1",
    tempSensor: "vertriqe_25351_amb_temp",
    humSensor: "vertriqe_25351_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 9,
    name: "2-2",
    tempSensor: "vertriqe_25352_amb_temp",
    humSensor: "vertriqe_25352_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 10,
    name: "2-3",
    tempSensor: "vertriqe_25353_amb_temp",
    humSensor: "vertriqe_25353_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 11,
    name: "2-4",
    tempSensor: "vertriqe_25354_amb_temp",
    humSensor: "vertriqe_25354_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 12,
    name: "2-5",
    tempSensor: "vertriqe_25355_amb_temp",
    humSensor: "vertriqe_25355_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 13,
    name: "2-6",
    tempSensor: "vertriqe_25356_amb_temp",
    humSensor: "vertriqe_25356_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 14,
    name: "2-7",
    tempSensor: "vertriqe_25357_amb_temp",
    humSensor: "vertriqe_25357_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 15,
    name: "2-8",
    tempSensor: "vertriqe_25365_amb_temp",
    humSensor: "vertriqe_25365_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 16,
    name: "2-9",
    tempSensor: "vertriqe_25366_amb_temp",
    humSensor: "vertriqe_25366_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 17,
    name: "2-10",
    tempSensor: "vertriqe_25367_amb_temp",
    humSensor: "vertriqe_25367_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 18,
    name: "2-11",
    tempSensor: "vertriqe_25368_amb_temp",
    humSensor: "vertriqe_25368_amb_hum",
    savingModeEnabled: false,
  },
  {
    id: 19,
    name: "2-12",
    tempSensor: "vertriqe_25369_amb_temp",
    humSensor: "vertriqe_25369_amb_hum",
    savingModeEnabled: false,
  }
]

// Combined sensor configurations
export const ALL_SENSORS = [...WEAVE_SENSORS, ...HUNT_SENSORS, ...HAI_SANG_SENSORS, ...ABOUT_COFFEE_SENSORS]

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
    .filter(sensor => sensor.type === 'instant' && !sensor.key.includes('accumulated') && sensor.name.toLowerCase().includes('combined'))
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

export function getZonesByOwner(owner: string): ZoneSensor[] {
  if (owner === "Weave Studio") {
    return WEAVE_ZONES
  } else if (owner === "The Hunt") {
    return HUNT_ZONES
  } else if (owner === "About Coffee Jeju") {
    return ABOUT_COFFEE_ZONES
  }
  return []
}
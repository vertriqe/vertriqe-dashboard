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
    name: "AC 1 - Average Power",
    type: "instant",
    owner: "Weave Studio",
    description: "Air conditioner 1 average power consumption"
  },
  {
    key: "vertriqe_25248_weave",
    name: "AC 2 - Average Power",
    type: "instant",
    owner: "Weave Studio",
    description: "Air conditioner 2 instant power consumption"
  },
  {
    key: "vertriqe_25245_weave",
    name: "Combined - Average Power",
    type: "instant",
    owner: "Weave Studio", 
    description: "Combined instant power consumption"
  },
  {
    key: "weave_ac1_accumulated",
    name: "AC 1 - Energy Consumption",
    type: "accumulated",
    owner: "Weave Studio",
    description: "Air conditioner 1 accumulated energy consumption"
  },
  {
    key: "weave_ac2_accumulated", 
    name: "AC 2 - Energy Consumption",
    type: "accumulated",
    owner: "Weave Studio",
    description: "Air conditioner 2 accumulated energy consumption"
  },
  {
    key: "weave_combined_accumulated",
    name: "Combined - Energy Consumption",
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
    name: "Area 1 - Instant Power (25120)",
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
    name: "Area 2 - Instant Power (25121)",
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
    name: "Area 3 - Instant Power (25122)",
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
    name: "Area 4 - Instant Power (25123)", 
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
    name: "Area 5 - Instant Power (25124)",
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

// TNL sensor configurations
export const TNL_SENSORS: SensorConfig[] = [
  {
    key: "vertriqe_25415_cctp",
    name: "Sensor 1 - Total Energy (25415)",
    type: "cumulative",
    owner: "TNL",
    description: "Sensor 1 cumulative energy consumption"
  },
  {
    key: "vertriqe_25415_cttp",
    name: "Sensor 1 - Instant Power (25415)",
    type: "instant",
    owner: "TNL",
    description: "Sensor 1 instantaneous power consumption"
  },
  {
    key: "vertriqe_25416_cctp",
    name: "Sensor 2 - Total Energy (25416)",
    type: "cumulative",
    owner: "TNL",
    description: "Sensor 2 cumulative energy consumption"
  },
  {
    key: "vertriqe_25416_cttp",
    name: "Sensor 2 - Instant Power (25416)",
    type: "instant",
    owner: "TNL",
    description: "Sensor 2 instantaneous power consumption"
  },
  // Room ambient sensors
  { key: "vertriqe_25420_amb_temp", name: "Room 1503 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25420_amb_hum", name: "Room 1503 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25423_amb_temp", name: "Room 1505 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25423_amb_hum", name: "Room 1505 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25429_amb_temp", name: "Room 1603 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25429_amb_hum", name: "Room 1603 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25432_amb_temp", name: "Room 1605 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25432_amb_hum", name: "Room 1605 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25435_amb_temp", name: "Room 1703 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25435_amb_hum", name: "Room 1703 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25438_amb_temp", name: "Room 1705 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25438_amb_hum", name: "Room 1705 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25381_amb_temp", name: "Room 1803 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25381_amb_hum", name: "Room 1803 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25378_amb_temp", name: "Room 1805 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25378_amb_hum", name: "Room 1805 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25414_amb_temp", name: "Room 1903 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25414_amb_hum", name: "Room 1903 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25426_amb_temp", name: "Room 1905 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25426_amb_hum", name: "Room 1905 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25441_amb_temp", name: "Room 2003 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25441_amb_hum", name: "Room 2003 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25444_amb_temp", name: "Room 2005 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25444_amb_hum", name: "Room 2005 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25408_amb_temp", name: "Room 2102 - Ambient Temperature", type: "instant", owner: "TNL" },
  { key: "vertriqe_25408_amb_hum", name: "Room 2102 - Ambient Humidity", type: "instant", owner: "TNL" },
  { key: "vertriqe_25411_amb_temp", name: "Room 2102 - Ambient Temperature (Alt)", type: "instant", owner: "TNL" },
  { key: "vertriqe_25411_amb_hum", name: "Room 2102 - Ambient Humidity (Alt)", type: "instant", owner: "TNL" }
]

// About Coffee Jeju sensor configurations
// Source: About Coffee Jeju.csv
// Area | Energy Meter | AC Controller | Present Sensor | Ambient Sensor | Supply Air Sensor
export const ABOUT_COFFEE_SENSORS: SensorConfig[] = [
  // 1-1: AC:25327, Present:25334, Ambient:25335, Supply:25349
  { key: "vertriqe_25327_temperature", name: "1-1 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25334_presence", name: "1-1 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25335_amb_temp2", name: "1-1 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25335_amb_hum2", name: "1-1 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25349_sup_temp", name: "1-1 Supply Air Temperature", type: "instant", owner: "About Coffee Jeju" },

  // 1-2: AC:25331, Present:25343, Ambient:25336
  { key: "vertriqe_25331_temperature", name: "1-2 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25343_presence", name: "1-2 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25336_amb_temp2", name: "1-2 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25336_amb_hum2", name: "1-2 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 1-3: AC:25329, Present:25344, Ambient:25337
  { key: "vertriqe_25329_temperature", name: "1-3 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25344_presence", name: "1-3 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25337_amb_temp2", name: "1-3 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25337_amb_hum2", name: "1-3 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 1-4: AC:25328, Present:25345, Ambient:25338, Supply:25350
  { key: "vertriqe_25328_temperature", name: "1-4 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25345_presence", name: "1-4 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25338_amb_temp2", name: "1-4 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25338_amb_hum2", name: "1-4 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25350_sup_temp", name: "1-4 Supply Air Temperature", type: "instant", owner: "About Coffee Jeju" },

  // 1-5: AC:25333, Present:25346, Ambient:25339
  { key: "vertriqe_25333_temperature", name: "1-5 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25346_presence", name: "1-5 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25339_amb_temp2", name: "1-5 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25339_amb_hum2", name: "1-5 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 1-6: AC:25330, Present:25347, Ambient:25340
  { key: "vertriqe_25330_temperature", name: "1-6 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25347_presence", name: "1-6 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25340_amb_temp2", name: "1-6 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25340_amb_hum2", name: "1-6 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 1-7: AC:25332, Present:25348, Ambient:25341
  { key: "vertriqe_25332_temperature", name: "1-7 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25348_presence", name: "1-7 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25341_amb_temp2", name: "1-7 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25341_amb_hum2", name: "1-7 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-1: AC:25405, Present:25358, Ambient:25351
  { key: "vertriqe_25405_temperature", name: "2-1 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25358_presence", name: "2-1 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25351_amb_temp2", name: "2-1 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25351_amb_hum2", name: "2-1 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-2: AC:25403, Present:25359, Ambient:25352
  { key: "vertriqe_25403_temperature", name: "2-2 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25359_presence", name: "2-2 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25352_amb_temp2", name: "2-2 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25352_amb_hum2", name: "2-2 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-3: AC:25404, Present:25360, Ambient:25353, Supply:25370
  { key: "vertriqe_25404_temperature", name: "2-3 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25360_presence", name: "2-3 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25353_amb_temp2", name: "2-3 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25353_amb_hum2", name: "2-3 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25370_sup_temp", name: "2-3 Supply Air Temperature", type: "instant", owner: "About Coffee Jeju" },

  // 2-4: AC:25402, Present:25361, Ambient:25354
  { key: "vertriqe_25402_temperature", name: "2-4 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25361_presence", name: "2-4 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25354_amb_temp2", name: "2-4 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25354_amb_hum2", name: "2-4 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-5: AC:25401, Present:25362, Ambient:25355
  { key: "vertriqe_25401_temperature", name: "2-5 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25362_presence", name: "2-5 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25355_amb_temp2", name: "2-5 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25355_amb_hum2", name: "2-5 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-6: AC:25400, Present:25363, Ambient:25356
  { key: "vertriqe_25400_temperature", name: "2-6 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25363_presence", name: "2-6 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25356_amb_temp2", name: "2-6 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25356_amb_hum2", name: "2-6 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-7: AC:25322, Present:25364, Ambient:25357, Supply:25371
  { key: "vertriqe_25322_temperature", name: "2-7 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25364_presence", name: "2-7 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25357_amb_temp2", name: "2-7 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25357_amb_hum2", name: "2-7 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25371_sup_temp", name: "2-7 Supply Air Temperature", type: "instant", owner: "About Coffee Jeju" },

  // 2-8: AC:25326, Present:25372, Ambient:25365
  { key: "vertriqe_25326_temperature", name: "2-8 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25372_presence", name: "2-8 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25365_amb_temp2", name: "2-8 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25365_amb_hum2", name: "2-8 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-9: AC:25321, Present:25373, Ambient:25366
  { key: "vertriqe_25321_temperature", name: "2-9 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25373_presence", name: "2-9 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25366_amb_temp2", name: "2-9 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25366_amb_hum2", name: "2-9 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-10: AC:25323, Present:25374, Ambient:25367
  { key: "vertriqe_25323_temperature", name: "2-10 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25374_presence", name: "2-10 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25367_amb_temp2", name: "2-10 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25367_amb_hum2", name: "2-10 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-11: AC:25324, Present:25375, Ambient:25368
  { key: "vertriqe_25324_temperature", name: "2-11 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25375_presence", name: "2-11 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25368_amb_temp2", name: "2-11 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25368_amb_hum2", name: "2-11 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },

  // 2-12: AC:25325, Present:25376, Ambient:25369
  { key: "vertriqe_25325_temperature", name: "2-12 AC Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25376_presence", name: "2-12 Presence", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25369_amb_temp2", name: "2-12 Ambient Temperature", type: "instant", owner: "About Coffee Jeju" },
  { key: "vertriqe_25369_amb_hum2", name: "2-12 Ambient Humidity", type: "instant", owner: "About Coffee Jeju" },
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

// Generate ABOUT_COFFEE_ZONES from ABOUT_COFFEE_SENSORS
// This automatically creates zone configurations from ambient sensors
function generateAboutCoffeeZones(): ZoneSensor[] {
  const zones: ZoneSensor[] = []
  // Filter for ambient temperature sensors (with '2' suffix)
  const ambientSensors = ABOUT_COFFEE_SENSORS.filter(s => s.key.includes('_amb_temp2'))

  ambientSensors.forEach((tempSensor, index) => {
    // Extract area name from sensor name (e.g., "1-1 Ambient Temperature" -> "1-1")
    const areaName = tempSensor.name.split(' ')[0]

    // Find corresponding humidity sensor (replace _amb_temp2 with _amb_hum2)
    const humSensorKey = tempSensor.key.replace('_amb_temp2', '_amb_hum2')

    zones.push({
      id: index + 1,
      name: areaName,
      tempSensor: tempSensor.key,
      humSensor: humSensorKey,
      savingModeEnabled: false
    })
  })

  return zones
}

export const ABOUT_COFFEE_ZONES: ZoneSensor[] = generateAboutCoffeeZones()

export const TNL_ZONES: ZoneSensor[] = [
  { id: 1, name: "Room 1503", tempSensor: "vertriqe_25420_amb_temp", humSensor: "vertriqe_25420_amb_hum", savingModeEnabled: false },
  { id: 2, name: "Room 1505", tempSensor: "vertriqe_25423_amb_temp", humSensor: "vertriqe_25423_amb_hum", savingModeEnabled: false },
  { id: 3, name: "Room 1603", tempSensor: "vertriqe_25429_amb_temp", humSensor: "vertriqe_25429_amb_hum", savingModeEnabled: false },
  { id: 4, name: "Room 1605", tempSensor: "vertriqe_25432_amb_temp", humSensor: "vertriqe_25432_amb_hum", savingModeEnabled: false },
  { id: 5, name: "Room 1703", tempSensor: "vertriqe_25435_amb_temp", humSensor: "vertriqe_25435_amb_hum", savingModeEnabled: false },
  { id: 6, name: "Room 1705", tempSensor: "vertriqe_25438_amb_temp", humSensor: "vertriqe_25438_amb_hum", savingModeEnabled: false },
  { id: 7, name: "Room 1803", tempSensor: "vertriqe_25381_amb_temp", humSensor: "vertriqe_25381_amb_hum", savingModeEnabled: false },
  { id: 8, name: "Room 1805", tempSensor: "vertriqe_25378_amb_temp", humSensor: "vertriqe_25378_amb_hum", savingModeEnabled: false },
  { id: 9, name: "Room 1903", tempSensor: "vertriqe_25414_amb_temp", humSensor: "vertriqe_25414_amb_hum", savingModeEnabled: false },
  { id: 10, name: "Room 1905", tempSensor: "vertriqe_25426_amb_temp", humSensor: "vertriqe_25426_amb_hum", savingModeEnabled: false },
  { id: 11, name: "Room 2003", tempSensor: "vertriqe_25441_amb_temp", humSensor: "vertriqe_25441_amb_hum", savingModeEnabled: false },
  { id: 12, name: "Room 2005", tempSensor: "vertriqe_25444_amb_temp", humSensor: "vertriqe_25444_amb_hum", savingModeEnabled: false },
  { id: 13, name: "Room 2102", tempSensor: "vertriqe_25408_amb_temp", humSensor: "vertriqe_25408_amb_hum", savingModeEnabled: false },
  { id: 14, name: "Room 2102 (Alt)", tempSensor: "vertriqe_25411_amb_temp", humSensor: "vertriqe_25411_amb_hum", savingModeEnabled: false }
]

// Combined sensor configurations
export const ALL_SENSORS = [...WEAVE_SENSORS, ...HUNT_SENSORS, ...HAI_SANG_SENSORS, ...TNL_SENSORS, ...ABOUT_COFFEE_SENSORS]

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

export function getTnlCumulativeSensors(): string[] {
  return TNL_SENSORS
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
  } else if (owner === "TNL") {
    return TNL_ZONES
  }
  return []
}
export interface WeatherLocation {
  name: string
  lat: string
  lon: string
}

export interface WeatherData {
  location: {
    name: string
    region: string
    country: string
    lat: number
    lon: number
    tz_id: string
    localtime_epoch: number
    localtime: string
  }
  current: {
    last_updated_epoch: number
    last_updated: string
    temp_c: number
    temp_f: number
    is_day: number
    condition: {
      text: string
      icon: string
      code: number
    }
    wind_mph: number
    wind_kph: number
    wind_degree: number
    wind_dir: string
    pressure_mb: number
    pressure_in: number
    precip_mm: number
    precip_in: number
    humidity: number
    cloud: number
    feelslike_c: number
    feelslike_f: number
    vis_km: number
    vis_miles: number
    uv: number
    gust_mph: number
    gust_kph: number
  }
}

export interface ForecastData {
  location: {
    name: string
    region: string
    country: string
    lat: number
    lon: number
    tz_id: string
    localtime_epoch: number
    localtime: string
  }
  current: {
    temp_c: number
    condition: {
      text: string
      icon: string
      code: number
    }
  }
  forecast: {
    forecastday: Array<{
      date: string
      date_epoch: number
      day: {
        maxtemp_c: number
        mintemp_c: number
        avgtemp_c: number
        condition: {
          text: string
          icon: string
          code: number
        }
      }
    }>
  }
}

export interface ProcessedWeatherData {
  currentTemperature: string
  forecast: {
    condition: string
    range: string
    date: string
  }
  weatherLocation: {
    name: string
    description: string
    condition: string
    temperature: string
  }
  weeklyWeather: {
    day: string
    condition: string
    icon: string
  }[]
}

import { redis } from "@/lib/redis"

const WEATHER_API_KEY = "931819cef02244adb32171107242312"
const WEATHER_API_BASE_URL = "https://api.weatherapi.com/v1" // Changed to HTTPS

const CACHE_TTL = 30 * 60 // 30 minutes in seconds

export async function fetchWeatherData(lat: string, lon: string): Promise<WeatherData | null> {
  try {
    const cacheKey = `weather:current:${lat},${lon}`

    // Check Redis cache first
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return JSON.parse(cachedData as string)
    }

    const url = `${WEATHER_API_BASE_URL}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Vertrique Dashboard/1.0",
      },
    })


    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Weather API error: ${response.status} ${response.statusText}`)
      console.error(`❌ Error details: ${errorText}`)
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`)
    }

    const data: WeatherData = await response.json()

    // Cache the data in Redis with TTL
    await redis.set(cacheKey, JSON.stringify(data), CACHE_TTL)
    return data
  } catch (error) {
    console.error("❌ Error fetching current weather data:", error)
    return null
  }
}

export function processWeatherData(currentData: WeatherData, locationNameOverride?: string): ProcessedWeatherData {

  const { location, current } = currentData

  // Generate a simple description based on weather condition
  const getWeatherDescription = (condition: string, temp: number): string => {
    const tempDesc = temp > 25 ? "warm" : temp > 15 ? "mild" : "cool"
    return `Today's weather is ${condition.toLowerCase()} with ${tempDesc} temperatures. Perfect for indoor activities.`
  }

  // Generate weekly weather using current conditions (no forecast data)
  const weeklyWeather = []
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  console.log("📊 Generating weekly weather using current conditions")

  for (let i = 0; i < 6; i++) {
    const today = new Date()
    today.setDate(today.getDate() + i)
    const dayOfWeek = daysOfWeek[today.getDay()]

    weeklyWeather.push({
      day: dayOfWeek,
      condition: current.condition.text,
      icon: current.condition.icon,
    })
  }

  // Create estimated temperature range based on current temperature
  const tempRange = `${Math.round(current.temp_c - 2)}/${Math.round(current.temp_c + 2)}°C`

  // Use override name if provided, otherwise use API's location name
  const displayName = locationNameOverride || location.name
  const processedData = {
    currentTemperature: `${Math.round(current.temp_c)}°C`,
    forecast: {
      condition: current.condition.text,
      range: tempRange,
      date: new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
    weatherLocation: {
      name: displayName,
      description: getWeatherDescription(current.condition.text, current.temp_c),
      condition: current.condition.text,
      temperature: `${Math.round(current.temp_c)}°C`,
    },
    weeklyWeather,
  }

  return processedData
}

export function getDummyWeatherData(): ProcessedWeatherData {
  console.log("⚠️ Using dummy weather data as fallback")

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const today = new Date()

  const weeklyWeather = []
  for (let i = 0; i < 6; i++) {
    const day = new Date(today)
    day.setDate(day.getDate() + i)
    weeklyWeather.push({
      day: daysOfWeek[day.getDay()],
      condition: "cloudy",
      icon: "",
    })
  }

  return {
    currentTemperature: "30°C",
    forecast: {
      condition: "Cloudy",
      range: "28/31°C",
      date: new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
    weatherLocation: {
      name: "The Hunt",
      description:
        "Today's weather would be a whole day cloudy with little to no chance of raining. It's a great time to run errands.",
      condition: "Cloudy",
      temperature: "30°C",
    },
    weeklyWeather,
  }
}

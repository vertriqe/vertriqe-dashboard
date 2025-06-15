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

const WEATHER_API_KEY = "931819cef02244adb32171107242312"
const WEATHER_API_BASE_URL = "https://api.weatherapi.com/v1" // Changed to HTTPS

// Cache for weather data
interface WeatherCache {
  [key: string]: {
    data: any
    timestamp: number
  }
}

const weatherCache: WeatherCache = {}
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes in milliseconds

export async function fetchWeatherData(lat: string, lon: string): Promise<WeatherData | null> {
  try {
    const cacheKey = `current:${lat},${lon}`
    const now = Date.now()

    // Check cache first
    if (weatherCache[cacheKey] && now - weatherCache[cacheKey].timestamp < CACHE_TTL) {
      console.log(`✅ Using cached current weather data for ${lat},${lon}`)
      return weatherCache[cacheKey].data
    }

    const url = `${WEATHER_API_BASE_URL}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`

    console.log(`🌤️ Fetching current weather from: ${url}`)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Vertrique Dashboard/1.0",
      },
    })

    console.log(`📡 Weather API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Weather API error: ${response.status} ${response.statusText}`)
      console.error(`❌ Error details: ${errorText}`)
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`)
    }

    const data: WeatherData = await response.json()
    console.log(`✅ Current weather data fetched successfully for ${data.location.name}`)
    console.log(`🌡️ Temperature: ${data.current.temp_c}°C, Condition: ${data.current.condition.text}`)

    // Cache the data
    weatherCache[cacheKey] = {
      data,
      timestamp: now,
    }

    return data
  } catch (error) {
    console.error("❌ Error fetching current weather data:", error)
    return null
  }
}

export async function fetchForecastData(lat: string, lon: string, days = 7): Promise<ForecastData | null> {
  try {
    const cacheKey = `forecast:${lat},${lon}:${days}`
    const now = Date.now()

    // Check cache first
    if (weatherCache[cacheKey] && now - weatherCache[cacheKey].timestamp < CACHE_TTL) {
      console.log(`✅ Using cached forecast data for ${lat},${lon}`)
      return weatherCache[cacheKey].data
    }

    const url = `${WEATHER_API_BASE_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&days=${days}&aqi=no`

    console.log(`🌤️ Fetching forecast from: ${url}`)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Vertrique Dashboard/1.0",
      },
    })

    console.log(`📡 Forecast API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Forecast API error: ${response.status} ${response.statusText}`)
      console.error(`❌ Error details: ${errorText}`)
      throw new Error(`Forecast API error: ${response.status} ${response.statusText}`)
    }

    const data: ForecastData = await response.json()
    console.log(`✅ Forecast data fetched successfully for ${data.location.name}`)
    console.log(`📅 Forecast days: ${data.forecast.forecastday.length}`)

    // Cache the data
    weatherCache[cacheKey] = {
      data,
      timestamp: now,
    }

    return data
  } catch (error) {
    console.error("❌ Error fetching forecast data:", error)
    return null
  }
}

export function processWeatherData(currentData: WeatherData, forecastData: ForecastData | null): ProcessedWeatherData {
  console.log("🔄 Processing weather data...")

  const { location, current } = currentData

  // Generate a simple description based on weather condition
  const getWeatherDescription = (condition: string, temp: number): string => {
    const tempDesc = temp > 25 ? "warm" : temp > 15 ? "mild" : "cool"
    return `Today's weather is ${condition.toLowerCase()} with ${tempDesc} temperatures. Perfect for indoor activities.`
  }

  // Process weekly weather from forecast data
  const weeklyWeather = []
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  if (forecastData && forecastData.forecast && forecastData.forecast.forecastday) {
    console.log(`📊 Processing ${forecastData.forecast.forecastday.length} forecast days`)

    for (let i = 0; i < Math.min(forecastData.forecast.forecastday.length, 6); i++) {
      const forecastDay = forecastData.forecast.forecastday[i]
      const date = new Date(forecastDay.date)
      const dayOfWeek = daysOfWeek[date.getDay()]

      weeklyWeather.push({
        day: dayOfWeek,
        condition: forecastDay.day.condition.text,
        icon: forecastDay.day.condition.icon,
      })
    }
  } else {
    console.log("⚠️ No forecast data available, using fallback weekly weather")
    // Fallback if no forecast data
    for (let i = 0; i < 6; i++) {
      const today = new Date()
      today.setDate(today.getDate() + i)
      const dayOfWeek = daysOfWeek[today.getDay()]

      weeklyWeather.push({
        day: dayOfWeek,
        condition: current.condition.text, // Use current condition as fallback
        icon: current.condition.icon,
      })
    }
  }

  // Get temperature range from forecast if available
  let tempRange = `${Math.round(current.temp_c - 2)}/${Math.round(current.temp_c + 2)}°C`

  if (forecastData && forecastData.forecast && forecastData.forecast.forecastday.length > 0) {
    const today = forecastData.forecast.forecastday[0]
    tempRange = `${Math.round(today.day.mintemp_c)}/${Math.round(today.day.maxtemp_c)}°C`
    console.log(`🌡️ Using forecast temperature range: ${tempRange}`)
  } else {
    console.log(`🌡️ Using estimated temperature range: ${tempRange}`)
  }

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
      name: location.name,
      description: getWeatherDescription(current.condition.text, current.temp_c),
      condition: current.condition.text,
      temperature: `${Math.round(current.temp_c)}°C`,
    },
    weeklyWeather,
  }

  console.log("✅ Weather data processed successfully")
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

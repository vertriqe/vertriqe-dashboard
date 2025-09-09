"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Cloud, Download } from "lucide-react"
import { LineChart } from "@/components/line-chart"
import { getLogoForUser } from "@/lib/logo-utils"
import { getCurrentFormattedDate } from "@/lib/date-utils"
import { useUser } from "@/contexts/user-context"
// Weather data will be fetched via API instead of direct import

interface TSDBDataPoint {
  key: string
  timestamp: number
  value: number
}

interface TSDBResponse {
  success: boolean
  data: {
    success: boolean
    data: TSDBDataPoint[]
    read_query_params: {
      lastx: number
      aggregation: string
    }
  }
}

interface TSDBConfig {
  success: boolean
  data: {
    multipliers: Record<string, number>
    units: Record<string, string>
    offsets: Record<string, number>
  }
}

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor: string
    backgroundColor: string
    tension?: number
    fill?: boolean
    pointRadius?: number
    pointHoverRadius?: number
  }[]
}

export default function EnergyDashboard() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState("60mins")
  const [activeAggregation, setActiveAggregation] = useState("avg")
  const [selectedOffice, setSelectedOffice] = useState("")
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tsdbConfig, setTsdbConfig] = useState<TSDBConfig | null>(null)
  const [currentUnit, setCurrentUnit] = useState("A")
  const [weatherData, setWeatherData] = useState<{ condition: string; temperature: string } | null>(null)
  const logo = getLogoForUser(user?.email)
  const currentDate = getCurrentFormattedDate()

  const timeRanges = {
    "60mins": { label: "60 Mins", seconds: 3600, downsampling: 60 },
    "24hours": { label: "24 Hours", seconds: 86400, downsampling: 3600 },
    "30days": { label: "30 Days", seconds: 2592000, downsampling: 86400 },
    "12months": { label: "12 Months", seconds: 31536000, downsampling: 2592000 }
  }

  const aggregationTypes = ["max", "min", "avg", "sum"]

// Project	Serial Number	Site 	Energy Meter 	AC Controller	Present Sensor 	Ambient Sensor 	Supply Air Sensor
// ADEST-000001	ADEST-000001-0001	The Hunt	25120		25133	25114	25138
// ADEST-000001	ADEST-000001-0002	The Hunt	25121	25151	25134	25115	25139
// ADEST-000001	ADEST-000001-0003	The Hunt	25122	25154	25135	25116	25140
// ADEST-000001	ADEST-000001-0004	The Hunt	25123	25153	25136	25117	25141
// ADEST-000001	ADEST-000001-0005	The Hunt	25124	25152	25137	25118	25142

  // All available sensors with their display names and user ownership
  const allSensors = {
    // Hai Sang's sensors
    "vertriqe_24833_cttp": { name: "Hai Sang Cold Room Power Consumption", owner: "Hai Sang" },
    "vertriqe_24836_temp2": { name: "Hai Sang Cold Room Temperature", owner: "Hai Sang" },
    
    // The Hunt's sensors
    "vertriqe_25120_cctp": { name: "Area 1 - Total Energy (25120)", owner: "The Hunt" },
    "vertriqe_25120_cttp": { name: "Area 1 - Instant Energy (25120)", owner: "The Hunt" },
    "vertriqe_25121_cctp": { name: "Area 2 - Total Energy (25121)", owner: "The Hunt" },
    "vertriqe_25121_cttp": { name: "Area 2 - Instant Energy (25121)", owner: "The Hunt" },
    "vertriqe_25122_cctp": { name: "Area 3 - Total Energy (25122)", owner: "The Hunt" },
    "vertriqe_25122_cttp": { name: "Area 3 - Instant Energy (25122)", owner: "The Hunt" },
    "vertriqe_25123_cctp": { name: "Area 4 - Total Energy (25123)", owner: "The Hunt" },
    "vertriqe_25123_cttp": { name: "Area 4 - Instant Energy (25123)", owner: "The Hunt" },
    "vertriqe_25124_cctp": { name: "Area 5 - Total Energy (25124)", owner: "The Hunt" },
    "vertriqe_25124_cttp": { name: "Area 5 - Instant Energy (25124)", owner: "The Hunt" },
    
    // Weave Studio's sensors
    "vertriqe_25245_cttp": { name: "AC 1 - Instant Energy", owner: "Weave Studio" },
    "vertriqe_25247_cttp": { name: "AC 2 - Instant Energy", owner: "Weave Studio" },
    "vertriqe_25248_cttp": { name: "Combined - Instant Energy", owner: "Weave Studio" },
    "weave_ac1_accumulated": { name: "AC 1 - Accumulated Energy", owner: "Weave Studio" },
    "weave_ac2_accumulated": { name: "AC 2 - Accumulated Energy", owner: "Weave Studio" },
    "weave_combined_accumulated": { name: "Combined - Accumulated Energy", owner: "Weave Studio" },
  }

  // Filter sensors based on current user
  const availableSensors = user?.name 
    ? Object.fromEntries(
        Object.entries(allSensors).filter(([_, sensor]) => sensor.owner === user.name)
      )
    : {}

  // Function to get the appropriate multiplier, unit, and offset for a key
  const getKeyConfig = (key: string) => {
    if (!tsdbConfig) return { multiplier: 1, unit: "", offset: 0 }

    // Find matching pattern in config
    for (const pattern in tsdbConfig.data.multipliers) {
      const regex = new RegExp(pattern.replace('*', '.*'))
      if (regex.test(key)) {
        return {
          multiplier: tsdbConfig.data.multipliers[pattern] || 1,
          unit: tsdbConfig.data.units[pattern] || "",
          offset: tsdbConfig.data.offsets[pattern] || 0
        }
      }
    }
    return { multiplier: 1, unit: "", offset: 0 }
  }

  // Fetch TSDB configuration
  const fetchTsdbConfig = async () => {
    try {
      const response = await fetch("https://gtsdb-admin.vercel.app/api/tsdb?apiUrl=http%3A%2F%2F35.221.150.154%3A5556", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ operation: "getapiurlconfig" })
      })

      if (!response.ok) {
        throw new Error("Failed to fetch TSDB config")
      }

      const config: TSDBConfig = await response.json()
      setTsdbConfig(config)
      console.log("TSDB Config loaded:", config)
    } catch (err) {
      console.error("Error fetching TSDB config:", err)
    }
  }

  // Fetch weather data via API
  const fetchWeatherInfo = async () => {
    try {
      const response = await fetch("/api/dashboard")
      const dashboardData = await response.json()
      
      if (dashboardData && dashboardData.forecast) {
        setWeatherData({
          condition: dashboardData.forecast.condition,
          temperature: dashboardData.forecast.range
        })
      } else {
        // Fallback to default values
        setWeatherData({
          condition: "Cloudy",
          temperature: "28/31°C"
        })
      }
    } catch (error) {
      console.error("Error fetching weather data:", error)
      // Fallback to default values
      setWeatherData({
        condition: "Cloudy",
        temperature: "28/31°C"
      })
    }
  }

  const fetchEnergyData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const now = Math.floor(Date.now() / 1000)
      const timeRange = timeRanges[activeTab as keyof typeof timeRanges]
      const startTimestamp = now - timeRange.seconds

      // Check if this is a derived/accumulated sensor
      const isAccumulated = selectedOffice.includes('_accumulated')
      let actualSensorKey = selectedOffice

      // Map accumulated sensors to their actual sensor keys
      if (isAccumulated) {
        const keyMapping: Record<string, string> = {
          'weave_ac1_accumulated': 'vertriqe_25245_cttp',
          'weave_ac2_accumulated': 'vertriqe_25247_cttp', 
          'weave_combined_accumulated': 'vertriqe_25248_cttp'
        }
        actualSensorKey = keyMapping[selectedOffice] || selectedOffice
      }

      const payload = {
        operation: "read",
        key: actualSensorKey, // Use the actual sensor key
        Read: {
          start_timestamp: startTimestamp,
          end_timestamp: now,
          downsampling: timeRange.downsampling,
          aggregation: activeAggregation,

        }
      }

      const response = await fetch("/api/tsdb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-url": "http://35.221.150.154:5556"
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error("Failed to fetch energy data")
      }

      const result: TSDBResponse = await response.json()

      if (result.success && result.data.success) {
        // Get configuration for the selected key
        const keyConfig = getKeyConfig(actualSensorKey)
        const displayUnit = isAccumulated ? "kWh" : keyConfig.unit
        setCurrentUnit(displayUnit)
        //check if result.data.data exists
        if (!result.data.data) {
          throw new Error("No data found")
        }

        // Convert the data to chart format
        const labels = result.data.data.map(point => {
          const date = new Date(point.timestamp * 1000)
          if (activeTab === "60mins") {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          } else if (activeTab === "24hours") {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
          }
        })

        // Process values - apply TSDB configuration and accumulation if needed
        const values = result.data.data.map((point, index) => {
          let processedValue = point.value * keyConfig.multiplier + keyConfig.offset
          
          // If this is an accumulated sensor, calculate cumulative sum
          if (isAccumulated) {
            let accumulatedValue = 0
            for (let i = 0; i <= index; i++) {
              accumulatedValue += result.data.data[i].value * keyConfig.multiplier + keyConfig.offset
            }
            return accumulatedValue
          }
          
          return processedValue
        })

        const sensorName = availableSensors[selectedOffice as keyof typeof availableSensors]?.name || selectedOffice

        setChartData({
          labels,
          datasets: [{
            label: `${sensorName} (${displayUnit})`,
            data: values,
            borderColor: "#22d3ee", // Cyan color like in the reference
            backgroundColor: "rgba(34, 211, 238, 0.1)",
            tension: 0.3,
            fill: false,
            pointRadius: 2,
            pointHoverRadius: 4
          }]
        })
      } else {
        throw new Error("Invalid response from TSDB")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error fetching energy data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Set default sensor when user data becomes available
  useEffect(() => {
    if (user?.name && Object.keys(availableSensors).length > 0 && !selectedOffice) {
      const firstSensorKey = Object.keys(availableSensors)[0]
      setSelectedOffice(firstSensorKey)
    }
  }, [user, availableSensors, selectedOffice])

  // Fetch TSDB config and weather data on component mount
  useEffect(() => {
    fetchTsdbConfig()
    fetchWeatherInfo()
  }, [])

  // Fetch energy data when dependencies change
  useEffect(() => {
    if (tsdbConfig && selectedOffice) {
      fetchEnergyData()
    }
  }, [activeTab, activeAggregation, selectedOffice, tsdbConfig])

  const handleExportData = () => {
    if (!chartData) return

    const sensorName = availableSensors[selectedOffice as keyof typeof availableSensors]?.name || selectedOffice

    // Create CSV content
    const csvContent = [
      ["Time", `${sensorName} (${currentUnit})`],
      ...chartData.labels.map((label, index) => [
        label,
        chartData.datasets[0].data[index]?.toString() || "0"
      ])
    ].map(row => row.join(",")).join("\n")

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sensorName.replace(/\s+/g, '-')}-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-slate-900 min-h-screen p-6 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-auto filter brightness-0 invert"
              style={{ maxHeight: 50, maxWidth: 200 }}
            />
          </div>
          <div className="text-right">
            <div className="text-lg">{currentDate}</div>
            <div className="flex items-center gap-2 text-slate-300">
              <Cloud className="h-4 w-4" />
              <span>{weatherData?.condition || "Loading..."}</span>
              <span>{weatherData?.temperature || "Loading..."}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Title and Sensor Selector */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold">Energy Dashboard</h2>
          {user?.name && (
            <>
              <span className="text-slate-400">-</span>
              <span className="text-lg text-slate-300">{user.name}</span>
            </>
          )}
          {Object.keys(availableSensors).length > 0 ? (
            <Select value={selectedOffice} onValueChange={setSelectedOffice}>
              <SelectTrigger className="w-auto bg-slate-700 border-slate-600">
                <SelectValue placeholder="Select a sensor" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {Object.entries(availableSensors).map(([key, sensor]) => (
                  <SelectItem key={key} value={key}>
                    {sensor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : user?.name ? (
            <div className="text-slate-400 text-sm">No sensors available for {user.name}</div>
          ) : (
            <div className="text-slate-400 text-sm">Loading user data...</div>
          )}
        </div>

        {/* Time Period and Aggregation Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300 mr-2">Last</span>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-slate-700">
                <TabsTrigger value="60mins" className="data-[state=active]:bg-blue-600">
                  60 Mins
                </TabsTrigger>
                <TabsTrigger value="24hours" className="data-[state=active]:bg-blue-600">
                  24 Hours
                </TabsTrigger>
                <TabsTrigger value="30days" className="data-[state=active]:bg-blue-600">
                  30 Days
                </TabsTrigger>
                <TabsTrigger value="12months" className="data-[state=active]:bg-blue-600">
                  12 Months
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            {aggregationTypes.map((type) => (
              <Button
                key={type}
                variant={activeAggregation === type ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveAggregation(type)}
                className={
                  activeAggregation === type
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-slate-700 border-slate-600 hover:bg-slate-600"
                }
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-96 text-red-400">
                <p>Error: {error}</p>
              </div>
            ) : chartData ? (
              <div className="h-96">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-slate-400">{currentUnit}</div>
                  <Button
                    onClick={handleExportData}
                    variant="outline"
                    size="sm"
                    className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
                <LineChart data={chartData} className="h-full" />
              </div>
            ) : (
              <div className="flex justify-center items-center h-96 text-slate-400">
                <p>No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

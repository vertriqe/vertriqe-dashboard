"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Cloud, Download } from "lucide-react"
import { LineChart } from "@/components/line-chart"
import { getCurrentFormattedDate } from "@/lib/date-utils"

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
  const [activeTab, setActiveTab] = useState("60mins")
  const [activeAggregation, setActiveAggregation] = useState("avg")
  const [selectedOffice, setSelectedOffice] = useState("vertriqe_24833_cttp")
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tsdbConfig, setTsdbConfig] = useState<TSDBConfig | null>(null)
  const [currentUnit, setCurrentUnit] = useState("A")
  const currentDate = getCurrentFormattedDate()

  const timeRanges = {
    "60mins": { label: "60 Mins", seconds: 3600, downsampling: 60 },
    "24hours": { label: "24 Hours", seconds: 86400, downsampling: 3600 },
    "30days": { label: "30 Days", seconds: 2592000, downsampling: 86400 },
    "12months": { label: "12 Months", seconds: 31536000, downsampling: 2592000 }
  }

  const aggregationTypes = ["max", "min", "avg", "sum"]

  // Available sensors with their display names
  const availableSensors = {
    "vertriqe_24833_cttp": "Hai Sang Cold Room Power Consumption",
    "vertriqe_24836_temp2": "Hai Sang Cold Room Tempeture"
  }

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

  const fetchEnergyData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const now = Math.floor(Date.now() / 1000)
      const timeRange = timeRanges[activeTab as keyof typeof timeRanges]
      const startTimestamp = now - timeRange.seconds

      const payload = {
        operation: "read",
        key: selectedOffice, // Use the selected sensor key
        Read: {
          start_timestamp: startTimestamp,
          end_timestamp: now,
          downsampling: timeRange.downsampling,
          aggregation: activeAggregation
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
        const keyConfig = getKeyConfig(selectedOffice)
        setCurrentUnit(keyConfig.unit)

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

        // Apply TSDB configuration: multiply by multiplier and add offset
        const values = result.data.data.map(point => {
          let processedValue = point.value * keyConfig.multiplier + keyConfig.offset
          // Ensure we have reasonable values for display
          return processedValue
        })

        const sensorName = availableSensors[selectedOffice as keyof typeof availableSensors] || selectedOffice

        setChartData({
          labels,
          datasets: [{
            label: `${sensorName} (${keyConfig.unit})`,
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

  // Fetch TSDB config on component mount
  useEffect(() => {
    fetchTsdbConfig()
  }, [])

  // Fetch energy data when dependencies change
  useEffect(() => {
    if (tsdbConfig) {
      fetchEnergyData()
    }
  }, [activeTab, activeAggregation, selectedOffice, tsdbConfig])

  const handleExportData = () => {
    if (!chartData) return

    const sensorName = availableSensors[selectedOffice as keyof typeof availableSensors] || selectedOffice

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
            <h1 className="text-2xl font-semibold">Hello VERTRIQE</h1>
          </div>
          <div className="text-right">
            <div className="text-lg">{currentDate}</div>
            <div className="flex items-center gap-2 text-slate-300">
              <Cloud className="h-4 w-4" />
              <span>Cloudy</span>
              <span>28/31°C</span>
            </div>
          </div>
        </div>

        {/* Dashboard Title and Sensor Selector */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold">Energy Dashboard</h2>
          <Select value={selectedOffice} onValueChange={setSelectedOffice}>
            <SelectTrigger className="w-auto bg-slate-700 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {Object.entries(availableSensors).map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart } from "@/components/bar-chart"
import { LineChart } from "@/components/line-chart"
import { PieChart } from "@/components/pie-chart"
import { useUser } from "@/contexts/user-context"
import { getCurrentFormattedDate } from "@/lib/date-utils"
import { getLogoForUser } from "@/lib/logo-utils"
import Image from "next/image"

interface PerformanceData {
  date: string
  weather: {
    condition: string
    range: string
  }
  metrics: {
    energySaved: string
    co2Reduced: string
    estimateSaving: string
    averageIndoorTemperature: string
    averageIndoorHumidity: string
    averageOutdoorTemperature: string
    averageOutdoorHumidity: string
  }
  usageData: {
    labels: string[]
    normalUsage: number[]
    otUsage: number[]
    normalPercentage: number[]
    otPercentage: number[]
    baseline: number[]
  }
  savingPercentage: {
    current: string
    data: number[]
  }
  acUsage: {
    acOn: number
    acOff: number
    otOn: number
  }
}

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState("week")
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useUser()
  const logo = getLogoForUser(user?.email)
  const currentDate = getCurrentFormattedDate()

  const fetchData = async (period: string = "week") => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/performance?period=${period}`)
      const data = await response.json()
      setPerformanceData(data)
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching performance data:", error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab])

  useEffect(() => {
    fetchData("week") // Initial load with week
  }, [])

  if (isLoading || !performanceData) {
    return (
      <div className="bg-slate-900 min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 min-h-screen p-6 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-auto filter brightness-0 invert"
              style={{ maxHeight: 50, maxWidth: 200 }}
            />
              <h1 className="text-2xl font-semibold">Hello {user?.name || "User"}</h1>
            </div>
            <h2 className="text-3xl font-bold mt-2">Performance Overview</h2>
          </div>
          <div className="text-right text-slate-300">
            <p>{currentDate}</p>
            <p>{performanceData.weather.condition}</p>
            <p>{performanceData.weather.range}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 p-4 rounded-lg bg-slate-800">
            {/* Time Period Tabs */}
            <div className="mb-6">
              <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
                <TabsList className="bg-slate-700 w-auto">
                  <TabsTrigger value="today" className="data-[state=active]:bg-slate-600">
                    Today
                  </TabsTrigger>
                  <TabsTrigger value="week" className="data-[state=active]:bg-slate-600">
                    Week
                  </TabsTrigger>
                  <TabsTrigger value="month" className="data-[state=active]:bg-slate-600">
                    Month
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                    <span className="text-sm">Energy Saved</span>
                  </div>
                  <div className="text-3xl font-bold">{performanceData.metrics.energySaved}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                    <span className="text-sm">CO2 Emission Reduced</span>
                  </div>
                  <div className="text-3xl font-bold">{performanceData.metrics.co2Reduced}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                    <span className="text-sm">Estimate Saving</span>
                  </div>
                  <div className="text-3xl font-bold">{performanceData.metrics.estimateSaving}</div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Chart */}
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500"></div>
                    <span className="text-sm">
                      {activeTab === "week" ? "Normal Usage (%)" : "Normal Usage (kWh)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500"></div>
                    <span className="text-sm">
                      {activeTab === "week" ? "OT Usage (%)" : "OT Usage"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white"></div>
                    <span className="text-sm">Baseline</span>
                  </div>
                </div>
                <BarChart
                  className="h-48 mt-4"
                  data={{
                    labels: performanceData.usageData.labels,
                    datasets: activeTab === "week" ? [
                      {
                        label: "Normal Usage (%)",
                        data: performanceData.usageData.normalPercentage,
                        backgroundColor: "#3b82f6",
                      },
                      {
                        label: "OT Usage (%)",
                        data: performanceData.usageData.otPercentage,
                        backgroundColor: "#ef4444",
                      },
                    ] : [
                      {
                        label: "Normal Usage (kWh)",
                        data: performanceData.usageData.normalUsage,
                        backgroundColor: "#3b82f6",
                      },
                      {
                        label: "OT Usage",
                        data: performanceData.usageData.otUsage,
                        backgroundColor: "#ef4444",
                      },
                    ],
                  }}
                  baseline={performanceData.usageData.baseline}
                  showPercentage={activeTab === "week"}
                />
              </CardContent>
            </Card>

            {/* Saving Percentage Chart */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 bg-purple-500"></div>
                  <span className="text-sm">Saving Percentage</span>
                </div>
                <div className="text-3xl font-bold mb-4">{performanceData.savingPercentage.current}</div>
                <LineChart
                  className="h-32 mt-4"
                  data={{
                    labels: performanceData.usageData.labels,
                    datasets: [
                      {
                        label: "Saving Percentage",
                        data: performanceData.savingPercentage.data,
                        borderColor: "#06b6d4",
                        backgroundColor: "#06b6d4",
                        tension: 0.4,
                      },
                    ],
                  }}
                  yAxisMax={50}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Indoor Temperature & Humidity Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">Indoor Conditions</h3>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                    <span className="text-sm">Indoor Temperature</span>
                  </div>
                  <div className="text-3xl font-bold">{performanceData.metrics.averageIndoorTemperature}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                    <span className="text-sm">Indoor Humidity</span>
                  </div>
                  <div className="text-3xl font-bold">{performanceData.metrics.averageIndoorHumidity}</div>
                </CardContent>
              </Card>
            </div>

            {/* Outdoor Temperature & Humidity Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">Outdoor Conditions</h3>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                    <span className="text-sm">Outdoor Temperature</span>
                  </div>
                  <div className="text-3xl font-bold">{performanceData.metrics.averageOutdoorTemperature}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                    <span className="text-sm">Outdoor Humidity</span>
                  </div>
                  <div className="text-3xl font-bold">{performanceData.metrics.averageOutdoorHumidity}</div>
                </CardContent>
              </Card>
            </div>

            {/* AC Usage Pie Chart */}
            <div className="p-4 rounded-lg bg-slate-800">
              <PieChart
                data={{
                  labels: ["AC On", "AC Off"],//, "OT On"
                  datasets: [
                    {
                      data: [performanceData.acUsage.acOn, performanceData.acUsage.acOff], //,  performanceData.acUsage.otOn
                      backgroundColor: ["#3b82f6", "transparent"],//, "#ef4444"
                    },
                  ],
                }}
                labels={[
                  { text: "AC On", value: `${performanceData.acUsage.acOn}%`, position: "top-right" },
                  { text: "AC Off", value: `${performanceData.acUsage.acOff}%`, position: "top-left" }
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

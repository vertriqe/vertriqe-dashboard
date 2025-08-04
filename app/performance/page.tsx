"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart } from "@/components/bar-chart"
import { LineChart } from "@/components/line-chart"
import { PieChart } from "@/components/pie-chart"
import { useUser } from "@/contexts/user-context"
import { getCurrentFormattedDate } from "@/lib/date-utils"
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
    averageTemperature: string
    averageHumidity: string
    averageOutdoorTemperature: string
  }
  usageData: {
    labels: string[]
    normalUsage: number[]
    otUsage: number[]
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
  const currentDate = getCurrentFormattedDate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/performance")
        const data = await response.json()
        setPerformanceData(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching performance data:", error)
        setIsLoading(false)
      }
    }

    fetchData()
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
              <Image
                src="/images/vertriqe-logo.png"
                alt="VERTRIQE Logo"
                width={120}
                height={36}
                className="h-auto filter brightness-0 invert"
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
              <Tabs defaultValue="week" className="w-full" onValueChange={setActiveTab}>
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
                    <span className="text-sm">Normal Usage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500"></div>
                    <span className="text-sm">OT Usage</span>
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
                    datasets: [
                      {
                        label: "Normal Usage",
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
            {/* Temperature Cards */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                  <span className="text-sm">Average Temperature</span>
                </div>
                <div className="text-3xl font-bold">{performanceData.metrics.averageTemperature}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                  <span className="text-sm">Average Humidity</span>
                </div>
                <div className="text-3xl font-bold">{performanceData.metrics.averageHumidity}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                  <span className="text-sm">Average Outdoor Temperature</span>
                </div>
                <div className="text-3xl font-bold">{performanceData.metrics.averageOutdoorTemperature}</div>
              </CardContent>
            </Card>

            {/* AC Usage Pie Chart */}
            <div className="p-4 rounded-lg bg-slate-800">
              <PieChart
                data={{
                  labels: ["AC On", "AC Off", "OT On"],
                  datasets: [
                    {
                      data: [performanceData.acUsage.acOn, performanceData.acUsage.acOff, performanceData.acUsage.otOn],
                      backgroundColor: ["#3b82f6", "#374151", "#ef4444"],
                    },
                  ],
                }}
                labels={[
                  { text: "OT On", value: `${performanceData.acUsage.otOn}%`, position: "top-right" },
                  { text: "AC On", value: `${performanceData.acUsage.acOn}%`, position: "top-left" },
                  { text: "AC Off", value: `${performanceData.acUsage.acOff}%`, position: "bottom" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

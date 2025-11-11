"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Cloud, Sun, ExternalLink, Info } from "lucide-react"
import { LineChart } from "@/components/line-chart"
import { useUser } from "@/contexts/user-context"
import { getCurrentFormattedDate } from "@/lib/date-utils"
import { getLogoForUser } from "@/lib/logo-utils"
import Image from "next/image"
import type { RssItem } from "@/lib/rss-parser"

interface DashboardData {
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
    icon?: string
  }[]
  energyUsage: {
    labels: string[]
    actualUsage: (number | null)[]
    energyForecast: number[]
    baselineForecast: number[]
  }
  energySavings: {
    percentage: string
    totalSaving: string
    co2Reduced: string
    energySaved: string
    calculationInfo?: {
      savingsPercentage: number
      co2Factor: number
      costPerKwh: number
      latestCumulative: number
    }
  }
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("month")
  const [analyticsTab, setAnalyticsTab] = useState("current")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [esgNews, setEsgNews] = useState<RssItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNewsLoading, setIsNewsLoading] = useState(true)
  const [showCalculationInfo, setShowCalculationInfo] = useState<string | null>(null)
  const [forecastData, setForecastData] = useState<{ labels: string[], values: number[], previousActual: number | null, projectedValues?: number[] } | null>(null)
  const { user } = useUser()
  const currentDate = getCurrentFormattedDate()
  const isHuntUser = user?.name === "The Hunt"
  const isWeaveStudioUser = user?.name === "Weave Studio"
  const isTnlUser = user?.name === "TNL"
  const isRealDataUser = isHuntUser || isWeaveStudioUser || isTnlUser
  const logo = getLogoForUser(user?.email)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard")
        const data = await response.json()
        setDashboardData(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setIsLoading(false)
      }
    }

    const fetchEsgNews = async () => {
      try {
        setIsNewsLoading(true)
        const response = await fetch("/api/esg-news")
        const data = await response.json()
        // Take only the first 3 news items
        setEsgNews(data.news.slice(0, 3))
      } catch (error) {
        console.error("Error fetching ESG news:", error)
      } finally {
        setIsNewsLoading(false)
      }
    }

    const fetchForecastData = async () => {
      try {
        // Map user to site ID
        const siteMap: { [key: string]: string } = {
          "The Hunt": "hunt",
          "Weave Studio": "weave",
          "Hai Sang": "haisang",
          "TNL": "tnl"
        }
        const siteId = siteMap[user?.name || ""] || "hunt"

        const response = await fetch(`/api/bill-analysis?siteId=${siteId}`)
        const data = await response.json()

        if (data.success && data.data.monthlyBreakdown) {
          // Generate forecast from previous month to 12 months ahead
          const breakdown = data.data.monthlyBreakdown
          const now = new Date()
          const forecastLabels: string[] = []
          const forecastValues: number[] = []
          let previousActual: number | null = null

          for (let i = -1; i <= 10; i++) {
            const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
            const month = futureDate.getMonth() + 1

            // Find matching month from previous year in breakdown
            const matchingData = breakdown.find((row: any) => row.month === month)

            forecastLabels.push(futureDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }))
            // Use AC-only usage (expectedACKwh) instead of total usage
            forecastValues.push(matchingData ? matchingData.expectedACKwh : 0)
          }

          // Fetch actual usage from backend API for previous month
          try {
            const usageResponse = await fetch("/api/previous-month-usage")
            const usageData = await usageResponse.json()

            if (usageData.success && usageData.usage) {
              previousActual = usageData.usage[0].value
            }
          } catch (error) {
            console.error("Error fetching previous month usage:", error)
          }

          // Fetch projected usage based on baseline regression model
          let projectedValues: number[] = []
          try {
            const projectionResponse = await fetch(`/api/forecast-projection?siteId=${siteId}`)
            const projectionData = await projectionResponse.json()

            if (projectionData.success && projectionData.projections) {
              projectedValues = projectionData.projections.map((p: any) => p.value)
            }
          } catch (error) {
            console.error("Error fetching projected usage:", error)
          }

          setForecastData({ labels: forecastLabels, values: forecastValues, previousActual, projectedValues })
        }
      } catch (error) {
        console.error("Error fetching forecast data:", error)
      }
    }

    fetchData()
    fetchEsgNews()
    if (user) {
      fetchForecastData()
    }
  }, [user])

  if (isLoading || !dashboardData) {
    return (
      <div className="bg-slate-900 min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Default weather icon if API doesn't provide one
  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase()
    if (conditionLower.includes("cloud")) return <Cloud className="h-6 w-6 text-slate-300" />
    if (conditionLower.includes("sun") || conditionLower.includes("clear"))
      return <Sun className="h-6 w-6 text-yellow-300" />
    return <Cloud className="h-6 w-6 text-slate-300" />
  }

  // Generate calculation info for metrics
  const getCalculationInfo = (type: string) => {
    const calc = dashboardData?.energySavings.calculationInfo
    if (!calc) return null

    switch (type) {
      case 'energySaved':
        return `Latest cumulative sum (${calc.latestCumulative.toFixed(1)} kWh) × ${calc.savingsPercentage}% = ${(calc.latestCumulative * calc.savingsPercentage / 100).toFixed(1)} kWh`
      case 'co2Reduced':
        const energySaved = calc.latestCumulative * calc.savingsPercentage / 100
        return `Energy saved (${energySaved.toFixed(1)} kWh) × ${calc.co2Factor} kg/kWh = ${(energySaved * calc.co2Factor).toFixed(1)} kg CO2`
      case 'totalSaving':
        const energySavedForCost = calc.latestCumulative * calc.savingsPercentage / 100
        return `Energy saved (${energySavedForCost.toFixed(1)} kWh) × ${calc.costPerKwh} HKD/kWh = ${(energySavedForCost * calc.costPerKwh).toFixed(1)} HKD`
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen p-6 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-auto filter brightness-0 invert"
              style={{ maxHeight: 50, maxWidth: 200 }}
            />
            <h1 className="text-2xl font-semibold">Morning {user?.name || "User"}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temperature and Forecast Section */}
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="mr-8">
                <h2 className="text-7xl font-bold">{dashboardData.currentTemperature}</h2>
                <div className="h-1 bg-slate-700 my-4"></div>
              </div>
              <div>
                <h3 className="text-xl mb-2">Today's Forecast</h3>
                <div className="text-slate-300">
                  <p>{dashboardData.forecast.condition}</p>
                  <p>{dashboardData.forecast.range}</p>
                  <p>{currentDate}</p>
                </div>
              </div>
            </div>

            {/* Weather Card */}
            <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl">
              <CardContent className="p-6 flex">
                <div className="mr-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-4 h-20 w-20 flex items-center justify-center shadow-lg">
                  <div className="relative">
                    <div className="absolute top-0 left-0 w-6 h-6 bg-blue-300/50 rounded-full"></div>
                    <Sun className="h-8 w-8 text-yellow-200 absolute bottom-0 right-0" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-white">
                    {dashboardData.weatherLocation.name}
                  </h3>
                  <p className="text-slate-300 mt-1">{dashboardData.weatherLocation.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-500/20 rounded-full text-blue-300 text-sm">
                      {dashboardData.weatherLocation.condition}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-300 font-medium">{dashboardData.weatherLocation.temperature}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weather Days */}
            <div className="grid grid-cols-6 gap-2 mt-4">
              {dashboardData.weeklyWeather.map((day) => (
                <div key={day.day} className="flex flex-col items-center">
                  {day.icon ? (
                    <img src={`https:${day.icon}`} alt={day.condition} className="h-8 w-8" />
                  ) : (
                    getWeatherIcon(day.condition)
                  )}
                  <span className="text-sm mt-2">{day.day}</span>
                  <span className="text-xs text-slate-400">{day.condition.split(" ")[0]}</span>
                </div>
              ))}
            </div>

            {/* Energy Usage Chart */}
            <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl mt-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Energy Usage Analytics</h3>
                </div>

                {/* Analytics Tabs */}
                <Tabs value={analyticsTab} onValueChange={setAnalyticsTab} className="w-full">
                  <TabsList className="bg-slate-700 w-full mb-4">
                    <TabsTrigger value="current" className="data-[state=active]:bg-slate-600 flex-1">
                      Current Usage
                    </TabsTrigger>
                    <TabsTrigger value="forecast" className="data-[state=active]:bg-slate-600 flex-1">
                      12-Month Forecast
                    </TabsTrigger>
                  </TabsList>

                  {/* Current Usage Tab */}
                  {analyticsTab === "current" && (
                    <div>
                      <div className="flex items-center justify-end gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-slate-300">Actual Usage (kWh)</span>
                        </div>
                        {/* Show baseline for real data users if available */}
                        {isRealDataUser && dashboardData.energyUsage.baselineForecast?.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                            <span className="text-sm text-slate-300">Baseline</span>
                          </div>
                        )}
                        {!isRealDataUser && (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                              <span className="text-sm text-slate-300">Energy Forecast</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                              <span className="text-sm text-slate-300">Baseline Forecast</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="bg-slate-900/30 rounded-xl p-4">
                        <LineChart
                          className="h-64"
                          data={{
                            labels: dashboardData.energyUsage.labels,
                            datasets: isRealDataUser
                              ? [
                                  {
                                    label: "Actual Usage (kWh)",
                                    data: dashboardData.energyUsage.actualUsage,
                                    borderColor: "#3b82f6",
                                    backgroundColor: "#3b82f6",
                                  },
                                  // Add baseline for real data users if available
                                  ...(dashboardData.energyUsage.baselineForecast?.length > 0 ? [{
                                    label: "Baseline",
                                    data: dashboardData.energyUsage.baselineForecast,
                                    borderColor: "#ffffff",
                                    backgroundColor: "#ffffff",
                                  }] : [])
                                ]
                              : [
                                  {
                                    label: "Actual Usage (kWh)",
                                    data: dashboardData.energyUsage.actualUsage,
                                    borderColor: "#3b82f6",
                                    backgroundColor: "#3b82f6",
                                  },
                                  {
                                    label: "Energy Forecast",
                                    data: dashboardData.energyUsage.energyForecast,
                                    borderColor: "#ec4899",
                                    backgroundColor: "#ec4899",
                                  },
                                  {
                                    label: "Baseline Forecast",
                                    data: dashboardData.energyUsage.baselineForecast,
                                    borderColor: "#ffffff",
                                    backgroundColor: "#ffffff",
                                  },
                                ],
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Forecast Tab */}
                  {analyticsTab === "forecast" && (
                    <div>
                      <div className="flex items-center justify-end gap-3 mb-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                          <span className="text-xs text-slate-300">Forecasted Usage (kWh)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-slate-300">Forecasted Usage After Saving</span>
                        </div>
                        {forecastData?.projectedValues && forecastData.projectedValues.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
                            <span className="text-xs text-slate-300">Projected Usage (Model)</span>
                          </div>
                        )}
                        {forecastData?.previousActual && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                            <span className="text-xs text-slate-300">Previous Month Actual</span>
                          </div>
                        )}
                      </div>
                      {forecastData ? (
                        <div className="bg-slate-900/30 rounded-xl p-4">
                          <LineChart
                            className="h-64"
                            data={{
                              labels: forecastData.labels,
                              datasets: [
                                {
                                  label: "Forecasted Usage (kWh)",
                                  data: forecastData.values,
                                  borderColor: "#a855f7",
                                  backgroundColor: "#a855f7",
                                },
                                {
                                  label: "Forecasted Usage After Saving",
                                  data: forecastData.values.map(value => value * 0.9),
                                  borderColor: "#22c55e",
                                  backgroundColor: "#22c55e",
                                },
                                ...(forecastData.projectedValues && forecastData.projectedValues.length > 0 ? [{
                                  label: "Projected Usage (Model)",
                                  data: forecastData.projectedValues,
                                  borderColor: "#f97316",
                                  backgroundColor: "#f97316",
                                  borderDash: [5, 5],
                                }] : []),
                                ...(forecastData.previousActual ? [{
                                  label: "Previous Month Actual",
                                  data: [forecastData.previousActual, ...Array(forecastData.values.length - 1).fill(null)],
                                  borderColor: "#3b82f6",
                                  backgroundColor: "#3b82f6",
                                  showLine: false,
                                  pointRadius: 6,
                                  pointHoverRadius: 8,
                                }] : []),
                              ],
                            }}
                          />
                        </div>
                      ) : (
                        <div className="bg-slate-900/30 rounded-xl p-4 flex items-center justify-center h-64">
                          <p className="text-slate-400">No forecast data available. Please analyze bill data in Super Admin first.</p>
                        </div>
                      )}
                    </div>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Energy Savings Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Congratulations {user?.name || "User"}!</h2>
              <div>
                <h3 className="text-xl">Total AC Energy Saved</h3>
                <div className="text-7xl font-bold mt-2">0%</div>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl relative group hover:scale-105 transition-transform duration-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg"></div>
                      <span className="text-sm font-medium text-slate-300">Total Saving</span>
                    </div>
                    {dashboardData.energySavings.calculationInfo && (
                      <button
                        onClick={() => setShowCalculationInfo(showCalculationInfo === 'totalSaving' ? null : 'totalSaving')}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700/50"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white">{dashboardData.energySavings.totalSaving}</div>
                  {showCalculationInfo === 'totalSaving' && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-800/90 backdrop-blur border border-slate-600/50 rounded-lg text-xs z-10 shadow-xl">
                      {getCalculationInfo('totalSaving')}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl relative group hover:scale-105 transition-transform duration-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-teal-500 rounded-full shadow-lg"></div>
                      <span className="text-sm font-medium text-slate-300">CO2 Reduced</span>
                    </div>
                    {dashboardData.energySavings.calculationInfo && (
                      <button
                        onClick={() => setShowCalculationInfo(showCalculationInfo === 'co2Reduced' ? null : 'co2Reduced')}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700/50"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white">{dashboardData.energySavings.co2Reduced}</div>
                  {showCalculationInfo === 'co2Reduced' && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-800/90 backdrop-blur border border-slate-600/50 rounded-lg text-xs z-10 shadow-xl">
                      {getCalculationInfo('co2Reduced')}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl relative group hover:scale-105 transition-transform duration-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg"></div>
                      <span className="text-sm font-medium text-slate-300">Energy Saved</span>
                    </div>
                    {dashboardData.energySavings.calculationInfo && (
                      <button
                        onClick={() => setShowCalculationInfo(showCalculationInfo === 'energySaved' ? null : 'energySaved')}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700/50"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white">{dashboardData.energySavings.energySaved}</div>
                  {showCalculationInfo === 'energySaved' && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-800/90 backdrop-blur border border-slate-600/50 rounded-lg text-xs z-10 shadow-xl">
                      {getCalculationInfo('energySaved')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Time Period Tabs */}
            <div className="mt-6">
              <Tabs defaultValue="month" className="w-full">
                <TabsList className="bg-slate-700 w-auto">
                  <TabsTrigger value="month" className="data-[state=active]:bg-slate-600">
                    Month
                  </TabsTrigger>
                  <TabsTrigger value="year" className="data-[state=active]:bg-slate-600">
                    Year
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* ESG Information */}
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-4">ESG Information</h3>

              {isNewsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : esgNews.length > 0 ? (
                esgNews.map((news) => (
                  <Card key={news.id} className="bg-slate-800 border-slate-700 mb-4">
                    <CardContent className="p-4">
                      <div className="flex justify-between">
                        <div className="flex-1 pr-4">
                          <p className="text-sm">{news.title}</p>
                          {news.pubDate && (
                            <p className="text-xs text-slate-400 mt-1">{new Date(news.pubDate).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-center bg-slate-700 rounded-full h-6 w-6 text-white">
                          <span>i</span>
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <a
                          href={news.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <span>Read More</span>
                          <ExternalLink className="ml-1 h-4 w-4" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4 text-center text-slate-400">
                    No ESG news available at the moment
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

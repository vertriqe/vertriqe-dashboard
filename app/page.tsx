"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Cloud, Sun, ExternalLink, Info } from "lucide-react"
import { LineChart } from "@/components/line-chart"
import { useUser } from "@/contexts/user-context"
import { getCurrentFormattedDate } from "@/lib/date-utils"
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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [esgNews, setEsgNews] = useState<RssItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNewsLoading, setIsNewsLoading] = useState(true)
  const [showCalculationInfo, setShowCalculationInfo] = useState<string | null>(null)
  const { user } = useUser()
  const currentDate = getCurrentFormattedDate()

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

    fetchData()
    fetchEsgNews()
  }, [])

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
    <div className="bg-slate-900 min-h-screen p-6 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <Image
              src="/images/vertriqe-logo.png"
              alt="VERTRIQE Logo"
              width={120}
              height={36}
              className="h-auto filter brightness-0 invert"
            />
            <h1 className="text-2xl font-semibold">Morning {user?.email?.split("@")[0] || "User"}</h1>
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
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex">
                <div className="mr-4 bg-blue-500 rounded-lg p-2 h-16 w-16 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute top-0 left-0 w-8 h-8 bg-blue-400 rounded-full"></div>
                    <Sun className="h-6 w-6 text-yellow-300 absolute bottom-0 right-0" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">{dashboardData.weatherLocation.name}</h3>
                  <p className="text-sm text-slate-300 mt-1">{dashboardData.weatherLocation.description}</p>
                  <div className="mt-2 text-sm text-slate-400">
                    {dashboardData.weatherLocation.condition} | {dashboardData.weatherLocation.temperature}
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
            <Card className="bg-slate-800 border-slate-700 mt-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500"></div>
                    <span className="text-sm">Actual Usage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-pink-500"></div>
                    <span className="text-sm">Energy Forecast</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white"></div>
                    <span className="text-sm">Baseline Forecast</span>
                  </div>
                </div>
                <LineChart
                  className="h-64 mt-4"
                  data={{
                    labels: dashboardData.energyUsage.labels,
                    datasets: [
                      {
                        label: "Actual Usage",
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
              </CardContent>
            </Card>
          </div>

          {/* Energy Savings Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Congratulations {user?.email?.split("@")[0] || "User"}!</h2>
              <div>
                <h3 className="text-xl">Total AC Energy Saved</h3>
                <div className="text-7xl font-bold mt-2">{dashboardData.energySavings.percentage}</div>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Card className="bg-slate-800 border-slate-700 relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                      <span className="text-sm">Total Saving</span>
                    </div>
                    {dashboardData.energySavings.calculationInfo && (
                      <button
                        onClick={() => setShowCalculationInfo(showCalculationInfo === 'totalSaving' ? null : 'totalSaving')}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-bold">{dashboardData.energySavings.totalSaving}</div>
                  {showCalculationInfo === 'totalSaving' && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-700 border border-slate-600 rounded-md text-xs z-10">
                      {getCalculationInfo('totalSaving')}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700 relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                      <span className="text-sm">Total CO2 Reduced</span>
                    </div>
                    {dashboardData.energySavings.calculationInfo && (
                      <button
                        onClick={() => setShowCalculationInfo(showCalculationInfo === 'co2Reduced' ? null : 'co2Reduced')}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-bold">{dashboardData.energySavings.co2Reduced}</div>
                  {showCalculationInfo === 'co2Reduced' && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-700 border border-slate-600 rounded-md text-xs z-10">
                      {getCalculationInfo('co2Reduced')}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700 relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                      <span className="text-sm">Total Energy Saved</span>
                    </div>
                    {dashboardData.energySavings.calculationInfo && (
                      <button
                        onClick={() => setShowCalculationInfo(showCalculationInfo === 'energySaved' ? null : 'energySaved')}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-bold">{dashboardData.energySavings.energySaved}</div>
                  {showCalculationInfo === 'energySaved' && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-700 border border-slate-600 rounded-md text-xs z-10">
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

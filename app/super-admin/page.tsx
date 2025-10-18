"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Shield, TrendingUp, Calculator, Download, FileText, DollarSign } from "lucide-react"
import { Chart } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  LineController
} from "chart.js"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  LineController
)

import { getTsdbUrl } from "@/lib/api-config"

interface DataPoint {
  timestamp: number
  energy: number
  temperature: number
}

interface RegressionResult {
  equation: string
  rSquared: number
  slope: number
  intercept: number
  type: 'linear' | 'quadratic' | 'logarithmic'
  coefficients?: { a?: number, b?: number, c?: number }
  // Marks if this regression was manually added by the user
  isManual?: boolean
}

interface TSDBConfig {
  success: boolean
  data: {
    multipliers: Record<string, number>
    units: Record<string, string>
    offsets: Record<string, number>
  }
}

export default function SuperAdminPage() {
  const [selectedSite, setSelectedSite] = useState("")
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().slice(0, 16)
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 16)
  })
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<DataPoint[]>([])
  const [regressions, setRegressions] = useState<RegressionResult[]>([])
  const [bestRegression, setBestRegression] = useState<RegressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tsdbConfig, setTsdbConfig] = useState<TSDBConfig | null>(null)
  const [selectedRegressionIndex, setSelectedRegressionIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [existingBaseline, setExistingBaseline] = useState<any>(null)
  const [billData, setBillData] = useState<string>("")
  const [billAnalysis, setBillAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [hourlyTempData, setHourlyTempData] = useState<string>("")
  // Manual model inputs
  const [manualType, setManualType] = useState<'linear' | 'quadratic' | 'logarithmic'>('linear')
  const [manualA, setManualA] = useState<string>("")
  const [manualB, setManualB] = useState<string>("")
  const [manualC, setManualC] = useState<string>("")
  const [manualError, setManualError] = useState<string | null>(null)
  // Remove all manually added regression curves
  const clearManualCurves = () => {
    setRegressions(prev => {
      const kept = prev.filter(r => !r.isManual)
      // Update selected index if it was pointing to a removed item
      if (selectedRegressionIndex !== null) {
        const selected = prev[selectedRegressionIndex]
        if (selected?.isManual) {
          setSelectedRegressionIndex(null)
        } else {
          // Recompute index among kept list
          const newIndex = kept.findIndex(r => r === selected)
          setSelectedRegressionIndex(newIndex >= 0 ? newIndex : null)
        }
      }
      // Update best regression
      const autos = kept.filter(r => !r.isManual)
      if (autos.length > 0) {
        const best = [...autos].sort((a, b) => b.rSquared - a.rSquared)[0]
        setBestRegression(best)
      } else {
        setBestRegression(null)
      }
      return kept
    })
  }

  const sites = [
    { value: "hunt", label: "The Hunt", energyKey: ["vertriqe_25120_cctp","vertriqe_25121_cctp","vertriqe_25122_cctp","vertriqe_25123_cctp","vertriqe_25124_cctp"], tempKey: "weather_thehunt_temp_c" },
    { value: "weave", label: "Weave Studio", energyKey: ["vertriqe_25245_weave"], tempKey: "weather_thehunt_temp_c" },
    { value: "haisang", label: "Hai Sang", energyKey: ["vertriqe_24833_cctp"], tempKey: "weather_thehunt_temp_c" }
  ]

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
      const response = await fetch(getTsdbUrl(), {
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

  // Load config on component mount
  useEffect(() => {
    fetchTsdbConfig()
  }, [])

  // Save selected regression as baseline
  const saveBaseline = async () => {
    if (selectedRegressionIndex === null || !selectedSite || regressions.length === 0) {
      setSaveMessage("Please select a site and regression model first")
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const selectedRegression = regressions[selectedRegressionIndex]
      const site = sites.find(s => s.value === selectedSite)

      const baselineData = {
        siteId: selectedSite,
        siteName: site?.label || selectedSite,
        regression: selectedRegression,
        dataRange: {
          start: startDate,
          end: endDate,
          dataPoints: data.length
        },
        createdAt: new Date().toISOString(),
        energyKey: site?.energyKey,
        tempKey: site?.tempKey
      }

      const response = await fetch('/api/baseline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(baselineData)
      })

      if (!response.ok) {
        throw new Error('Failed to save baseline')
      }

      setSaveMessage(`Baseline saved successfully for ${site?.label}`)
      setTimeout(() => setSaveMessage(null), 5000)

    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save baseline")
      setTimeout(() => setSaveMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  // Load existing baseline when site is selected
  const loadExistingBaseline = async (siteId: string) => {
    try {
      const response = await fetch(`/api/baseline?siteId=${siteId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setExistingBaseline(result.data)
        }
      } else {
        setExistingBaseline(null)
      }
    } catch (err) {
      console.error("Error loading existing baseline:", err)
      setExistingBaseline(null)
    }
  }

  // Load baseline when site changes
  useEffect(() => {
    if (selectedSite) {
      loadExistingBaseline(selectedSite)
    } else {
      setExistingBaseline(null)
    }
  }, [selectedSite])

  // Parse TSV data and calculate AC vs non-AC usage
  const analyzeBillData = async () => {
    if (!billData.trim()) {
      setAnalysisError("Please paste TSV data")
      return
    }

    if (!existingBaseline) {
      setAnalysisError("Please select a site with a saved baseline regression model")
      return
    }

    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      // Parse hourly temperature data if provided
      const hourlyTempMap = new Map<number, number>() // timestamp -> temp
      let minTimestamp = Infinity
      let maxTimestamp = -Infinity

      if (hourlyTempData.trim()) {
        const tempLines = hourlyTempData.trim().split('\n')
        for (let i = 1; i < tempLines.length; i++) { // Skip header
          const cols = tempLines[i].split(',')
          if (cols.length >= 2) {
            const timestamp = parseInt(cols[0])
            const temp = parseFloat(cols[1])
            if (!isNaN(timestamp) && !isNaN(temp)) {
              hourlyTempMap.set(timestamp, temp)
              minTimestamp = Math.min(minTimestamp, timestamp)
              maxTimestamp = Math.max(maxTimestamp, timestamp)
            }
          }
        }
        console.log(`[DEBUG] Loaded ${hourlyTempMap.size} hourly temperature records`)
        console.log(`[DEBUG] Temperature data range: ${new Date(minTimestamp * 1000).toISOString()} to ${new Date(maxTimestamp * 1000).toISOString()}`)
        console.log(`[DEBUG] Regression model:`, existingBaseline.regression)
      }

      // Parse TSV data
      const lines = billData.trim().split('\n')
      const headers = lines[0].split('\t')

      // Find column indices - look for the right-side data that has Avg Temp
      const tempIdx = headers.findIndex(h => h.toLowerCase().includes('avg temp'))

      if (tempIdx === -1) {
        throw new Error("Could not find 'Avg Temp.' column")
      }

      // The right-side data structure: Year, Month, kWh, $, $ per kWh, Avg Temp.
      // Working backwards from tempIdx
      const costPerKwhIdx = tempIdx - 1  // $ per kWh
      const costIdx = tempIdx - 2        // $
      const kwhIdx = tempIdx - 3         // kWh
      const monthIdx = tempIdx - 4       // Month
      const yearIdx = tempIdx - 5        // Year

      console.log('[DEBUG] Column indices:', { yearIdx, monthIdx, kwhIdx, costIdx, tempIdx })

      const rows = []

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t')
        if (cols.length < Math.max(yearIdx, monthIdx, kwhIdx, costIdx, tempIdx) + 1) continue

        const year = parseInt(cols[yearIdx])
        const month = parseInt(cols[monthIdx])
        const kwh = parseFloat(cols[kwhIdx].replace(/,/g, ''))
        const cost = parseFloat(cols[costIdx].replace(/[,$\s]/g, ''))
        const avgTemp = parseFloat(cols[tempIdx])

        if (isNaN(year) || isNaN(month) || isNaN(kwh) || isNaN(cost) || isNaN(avgTemp)) continue

        const regression = existingBaseline.regression
        let predictedACUsage = 0
        let hoursProcessed = 0
        let usedHourlyData = false

        // Try to use hourly temperature data if available
        if (hourlyTempMap.size > 0) {
          // Calculate start and end timestamps for this month
          const startDate = new Date(year, month - 1, 1)
          const endDate = new Date(year, month, 0, 23, 59, 59)
          const startTimestamp = Math.floor(startDate.getTime() / 1000)
          const endTimestamp = Math.floor(endDate.getTime() / 1000)

          let hourlyACSum = 0

          // Sum up hourly AC predictions for all hours in the month
          for (let ts = startTimestamp; ts <= endTimestamp; ts += 3600) {
            const temp = hourlyTempMap.get(ts)
            if (temp !== undefined) {
              let hourlyACPower = 0

              if (regression.type === 'linear') {
                hourlyACPower = regression.slope * temp + regression.intercept
              } else if (regression.type === 'quadratic' && regression.coefficients) {
                const { a, b, c } = regression.coefficients
                hourlyACPower = (a || 0) * temp * temp + (b || 0) * temp + (c || 0)
              } else if (regression.type === 'logarithmic' && temp > 0) {
                hourlyACPower = regression.slope * Math.log(temp) + regression.intercept
              }

              // Accumulate hourly energy (kW * 1 hour = kWh)
              hourlyACSum += Math.max(0, hourlyACPower)
              hoursProcessed++
            }
          }

          // Only use hourly data if we found enough data points (at least 50% coverage)
          const expectedHours = Math.floor((endTimestamp - startTimestamp) / 3600)
          if (hoursProcessed > expectedHours * 0.5) {
            predictedACUsage = hourlyACSum
            usedHourlyData = true
            console.log(`[DEBUG] ${year}-${month}: Used ${hoursProcessed} hourly temp records, predicted AC (raw): ${predictedACUsage.toFixed(2)} kWh, total: ${kwh} kWh`)
          }
        }

        // Fallback: Use monthly average temperature if hourly data not available or insufficient
        if (!usedHourlyData) {
          // Fallback: Use monthly average temperature
          // Since we don't have hourly data, we simulate by applying regression to avg temp
          const daysInMonth = new Date(year, month, 0).getDate()
          const hoursInMonth = daysInMonth * 24

          let hourlyACPower = 0

          if (regression.type === 'linear') {
            hourlyACPower = regression.slope * avgTemp + regression.intercept
          } else if (regression.type === 'quadratic' && regression.coefficients) {
            const { a, b, c } = regression.coefficients
            hourlyACPower = (a || 0) * avgTemp * avgTemp + (b || 0) * avgTemp + (c || 0)
          } else if (regression.type === 'logarithmic' && avgTemp > 0) {
            hourlyACPower = regression.slope * Math.log(avgTemp) + regression.intercept
          }

          // Scale by hours in month to get total energy
          // But only count positive values (AC doesn't use negative power)
          predictedACUsage = Math.max(0, hourlyACPower) * hoursInMonth

          console.log(`[DEBUG] ${year}-${month}: Using avg temp ${avgTemp}°C`)
          console.log(`[DEBUG]   Hourly AC power: ${hourlyACPower.toFixed(2)} kW`)
          console.log(`[DEBUG]   Hours in month: ${hoursInMonth}`)
          console.log(`[DEBUG]   Predicted AC (raw): ${predictedACUsage.toFixed(2)} kWh`)
          console.log(`[DEBUG]   Total kWh: ${kwh}`)
          console.log(`[DEBUG]   Regression: ${regression.equation}`)
        }

        // Store the expected/predicted AC usage (don't clamp it)
        const expectedACUsage = Math.max(0, predictedACUsage)
        const expectedACCost = (expectedACUsage / kwh) * cost

        const nonACKwh = kwh - expectedACUsage
        const nonACCost = cost - expectedACCost

        rows.push({
          year,
          month,
          date: `${year}-${String(month).padStart(2, '0')}`,
          totalKwh: kwh,
          totalCost: cost,
          costPerKwh: cost / kwh,
          temperature: avgTemp,
          expectedACKwh: expectedACUsage,
          expectedACCost: expectedACCost,
          nonACKwh: nonACKwh,
          nonACCost: nonACCost,
          acPercentage: kwh > 0 ? (expectedACUsage / kwh) * 100 : 0,
          usedHourlyData
        })
      }

      if (rows.length === 0) {
        throw new Error("No valid data rows found")
      }

      // Calculate totals and averages for all data
      const totals = {
        totalKwh: rows.reduce((sum, r) => sum + r.totalKwh, 0),
        totalCost: rows.reduce((sum, r) => sum + r.totalCost, 0),
        expectedACKwh: rows.reduce((sum, r) => sum + r.expectedACKwh, 0),
        expectedACCost: rows.reduce((sum, r) => sum + r.expectedACCost, 0),
        nonACKwh: rows.reduce((sum, r) => sum + r.nonACKwh, 0),
        nonACCost: rows.reduce((sum, r) => sum + r.nonACCost, 0),
        avgTemp: rows.reduce((sum, r) => sum + r.temperature, 0) / rows.length,
        avgACPercentage: rows.reduce((sum, r) => sum + r.acPercentage, 0) / rows.length
      }

      // Calculate stats for the latest 12 months
      const last12Months = rows.slice(-12)
      const last12MonthsStats = {
        totalKwh: last12Months.reduce((sum, r) => sum + r.totalKwh, 0),
        totalCost: last12Months.reduce((sum, r) => sum + r.totalCost, 0),
        expectedACKwh: last12Months.reduce((sum, r) => sum + r.expectedACKwh, 0),
        expectedACCost: last12Months.reduce((sum, r) => sum + r.expectedACCost, 0),
        nonACKwh: last12Months.reduce((sum, r) => sum + r.nonACKwh, 0),
        nonACCost: last12Months.reduce((sum, r) => sum + r.nonACCost, 0),
        avgTemp: last12Months.reduce((sum, r) => sum + r.temperature, 0) / last12Months.length,
        avgACPercentage: last12Months.reduce((sum, r) => sum + r.acPercentage, 0) / last12Months.length,
        startDate: last12Months[0]?.date || '',
        endDate: last12Months[last12Months.length - 1]?.date || ''
      }

      setBillAnalysis({ rows, totals, last12MonthsStats })

      // Cache the input data and monthly breakdown in Redis
      try {
        await fetch('/api/bill-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            siteId: selectedSite,
            inputData: {
              billData,
              hourlyTempData,
              timestamp: new Date().toISOString()
            },
            monthlyBreakdown: rows
          })
        })
        console.log('Bill analysis data cached successfully')
      } catch (cacheErr) {
        console.warn('Failed to cache bill analysis data:', cacheErr)
        // Don't show error to user, just log it
      }

    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to analyze data")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Export bill analysis results
  const exportBillAnalysis = () => {
    if (!billAnalysis) return

    const csvContent = [
      ["Electric Bill Analysis - AC vs Non-AC Usage"],
      ["Site:", existingBaseline?.siteName || "Unknown"],
      ["Regression Model:", existingBaseline?.regression.type || "Unknown"],
      ["Analysis Date:", new Date().toISOString()],
      [],
      ["Latest 12 Months Summary", `${billAnalysis.last12MonthsStats?.startDate || ''} to ${billAnalysis.last12MonthsStats?.endDate || ''}`],
      ["Total kWh", billAnalysis.last12MonthsStats?.totalKwh.toFixed(2) || "0"],
      ["Total Cost", billAnalysis.last12MonthsStats?.totalCost.toFixed(2) || "0"],
      ["Expected AC kWh", billAnalysis.last12MonthsStats?.expectedACKwh.toFixed(2) || "0"],
      ["Expected AC Cost", billAnalysis.last12MonthsStats?.expectedACCost.toFixed(2) || "0"],
      ["Non-AC kWh", billAnalysis.last12MonthsStats?.nonACKwh.toFixed(2) || "0"],
      ["Non-AC Cost", billAnalysis.last12MonthsStats?.nonACCost.toFixed(2) || "0"],
      ["Avg Temperature", billAnalysis.last12MonthsStats?.avgTemp.toFixed(1) || "0"],
      ["Avg AC %", billAnalysis.last12MonthsStats?.avgACPercentage.toFixed(1) || "0"],
      [],
      ["Monthly Data"],
      ["Date", "Year", "Month", "Avg Temp (°C)", "Total kWh", "Total Cost", "$/kWh", "Expected AC kWh", "Expected AC Cost", "Non-AC kWh", "Non-AC Cost", "AC %"],
      ...billAnalysis.rows.map((row: any) => [
        row.date,
        row.year,
        row.month,
        row.temperature.toFixed(1),
        row.totalKwh.toFixed(2),
        row.totalCost.toFixed(2),
        row.costPerKwh.toFixed(3),
        row.expectedACKwh.toFixed(2),
        row.expectedACCost.toFixed(2),
        row.nonACKwh.toFixed(2),
        row.nonACCost.toFixed(2),
        row.acPercentage.toFixed(1)
      ]),
      [],
      ["All Time Summary"],
      ["Total kWh", billAnalysis.totals.totalKwh.toFixed(2)],
      ["Total Cost", billAnalysis.totals.totalCost.toFixed(2)],
      ["Expected AC kWh", billAnalysis.totals.expectedACKwh.toFixed(2)],
      ["Expected AC Cost", billAnalysis.totals.expectedACCost.toFixed(2)],
      ["Non-AC kWh", billAnalysis.totals.nonACKwh.toFixed(2)],
      ["Non-AC Cost", billAnalysis.totals.nonACCost.toFixed(2)],
      ["Avg Temperature", billAnalysis.totals.avgTemp.toFixed(1)],
      ["Avg AC %", billAnalysis.totals.avgACPercentage.toFixed(1)]
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bill-analysis-${selectedSite}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-3xl font-bold text-white">Super Admin</h1>
          <p className="text-slate-400">Advanced system administration panel</p>
        </div>
        <Badge variant="destructive" className="ml-auto">
          Restricted Access
        </Badge>
      </div>

      {/* AC vs Non-AC Cost Analysis */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-green-500" />
            <CardTitle className="text-white">Electric Bill Analysis - AC vs Non-AC</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Site (must have saved baseline)</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {sites.map((site) => (
                    <SelectItem key={site.value} value={site.value}>
                      {site.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {existingBaseline && (
              <div className="p-4 bg-green-900/30 border border-green-700 rounded-md">
                <h4 className="font-semibold text-green-400 mb-2">Using Baseline Model</h4>
                <div className="text-sm">
                  <p className="text-slate-300">Model: <span className="text-green-400 capitalize">{existingBaseline.regression.type}</span></p>
                  <p className="text-slate-300">R²: <span className="text-green-400">{existingBaseline.regression.rSquared.toFixed(4)}</span></p>
                  <code className="bg-slate-800 p-2 rounded text-cyan-400 block text-xs mt-2">
                    {existingBaseline.regression.equation}
                  </code>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="billData" className="text-white">
                <FileText className="inline h-4 w-4 mr-2" />
                Paste Electric Bill TSV Data (Year, Month, kWh, $, Avg Temp.)
              </Label>
              <Textarea
                id="billData"
                value={billData}
                onChange={(e) => setBillData(e.target.value)}
                placeholder="Paste your TSV data here (with headers)..."
                className="h-40 bg-slate-700 border-slate-600 text-white font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourlyTempData" className="text-white">
                <FileText className="inline h-4 w-4 mr-2" />
                Paste Hourly Temperature CSV (Optional, for more accurate prediction)
              </Label>
              <Textarea
                id="hourlyTempData"
                value={hourlyTempData}
                onChange={(e) => setHourlyTempData(e.target.value)}
                placeholder="dt,temp,humidity&#10;1735689600,18.5,65&#10;1735693200,19.2,63&#10;..."
                className="h-32 bg-slate-700 border-slate-600 text-white font-mono text-sm"
              />
              <p className="text-xs text-slate-400">
                Format: Unix timestamp (seconds), temperature (°C), humidity. The function will use hourly temperatures to calculate AC usage hour-by-hour for better accuracy.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={analyzeBillData}
                disabled={!selectedSite || !existingBaseline || !billData.trim() || isAnalyzing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Bill"}
              </Button>
              {billAnalysis && (
                <Button
                  onClick={exportBillAnalysis}
                  variant="outline"
                  className="border-slate-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              )}
            </div>
          </div>

          {analysisError && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-md">
              <p className="text-red-200">{analysisError}</p>
            </div>
          )}

          {billAnalysis && (
            <div className="space-y-6">
              {/* Latest 12 Months Summary */}
              {billAnalysis.last12MonthsStats && (
                <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700">
                  <CardHeader>
                    <CardTitle className="text-white">Latest 12 Months Summary ({billAnalysis.last12MonthsStats.startDate} to {billAnalysis.last12MonthsStats.endDate})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-slate-300 text-sm">Total Cost</p>
                        <p className="text-2xl font-bold text-white">${billAnalysis.last12MonthsStats.totalCost.toLocaleString()}</p>
                        <p className="text-slate-400 text-xs mt-1">{billAnalysis.last12MonthsStats.totalKwh.toLocaleString()} kWh</p>
                      </div>
                      <div>
                        <p className="text-slate-300 text-sm">Expected AC Cost</p>
                        <p className="text-2xl font-bold text-orange-400">${billAnalysis.last12MonthsStats.expectedACCost.toLocaleString()}</p>
                        <p className="text-slate-400 text-xs mt-1">{billAnalysis.last12MonthsStats.expectedACKwh.toLocaleString()} kWh</p>
                      </div>
                      <div>
                        <p className="text-slate-300 text-sm">Non-AC Cost</p>
                        <p className="text-2xl font-bold text-blue-400">${billAnalysis.last12MonthsStats.nonACCost.toLocaleString()}</p>
                        <p className="text-slate-400 text-xs mt-1">{billAnalysis.last12MonthsStats.nonACKwh.toLocaleString()} kWh</p>
                      </div>
                      <div>
                        <p className="text-slate-300 text-sm">Avg AC Usage</p>
                        <p className="text-2xl font-bold text-cyan-400">{billAnalysis.last12MonthsStats.avgACPercentage.toFixed(1)}%</p>
                        <p className="text-slate-400 text-xs mt-1">Avg: {billAnalysis.last12MonthsStats.avgTemp.toFixed(1)}°C</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Time Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900/50 border-slate-600">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Total Cost</p>
                    <p className="text-2xl font-bold text-white">${billAnalysis.totals.totalCost.toLocaleString()}</p>
                    <p className="text-slate-400 text-xs mt-1">{billAnalysis.totals.totalKwh.toLocaleString()} kWh</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-600">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Expected AC Cost</p>
                    <p className="text-2xl font-bold text-orange-400">${billAnalysis.totals.expectedACCost.toLocaleString()}</p>
                    <p className="text-slate-400 text-xs mt-1">{billAnalysis.totals.expectedACKwh.toLocaleString()} kWh</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-600">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Non-AC Cost</p>
                    <p className="text-2xl font-bold text-blue-400">${billAnalysis.totals.nonACCost.toLocaleString()}</p>
                    <p className="text-slate-400 text-xs mt-1">{billAnalysis.totals.nonACKwh.toLocaleString()} kWh</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-600">
                  <CardContent className="pt-6">
                    <p className="text-slate-400 text-sm">Avg AC Usage</p>
                    <p className="text-2xl font-bold text-cyan-400">{billAnalysis.totals.avgACPercentage.toFixed(1)}%</p>
                    <p className="text-slate-400 text-xs mt-1">Avg Temp: {billAnalysis.totals.avgTemp.toFixed(1)}°C</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Table */}
              <Card className="bg-slate-900/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Monthly Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left p-2 text-slate-300">Date</th>
                          <th className="text-right p-2 text-slate-300">Temp</th>
                          <th className="text-right p-2 text-slate-300">Total kWh</th>
                          <th className="text-right p-2 text-slate-300">Total $</th>
                          <th className="text-right p-2 text-slate-300">Expected AC kWh</th>
                          <th className="text-right p-2 text-slate-300">Expected AC $</th>
                          <th className="text-right p-2 text-slate-300">Non-AC kWh</th>
                          <th className="text-right p-2 text-slate-300">Non-AC $</th>
                          <th className="text-right p-2 text-slate-300">AC %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billAnalysis.rows.map((row: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="p-2 text-white">
                              {row.date}
                              {row.usedHourlyData && <span className="ml-1 text-xs text-green-400" title="Used hourly temperature data">✓</span>}
                            </td>
                            <td className="text-right p-2 text-white">{row.temperature.toFixed(1)}°C</td>
                            <td className="text-right p-2 text-white">{row.totalKwh.toLocaleString()}</td>
                            <td className="text-right p-2 text-white">${row.totalCost.toLocaleString()}</td>
                            <td className="text-right p-2 text-purple-400" title="Predicted AC usage from regression model">
                              {row.expectedACKwh.toFixed(0)}
                            </td>
                            <td className="text-right p-2 text-purple-400">${row.expectedACCost.toFixed(0)}</td>
                            <td className="text-right p-2 text-blue-400">{row.nonACKwh.toLocaleString()}</td>
                            <td className="text-right p-2 text-blue-400">${row.nonACCost.toLocaleString()}</td>
                            <td className="text-right p-2 text-cyan-400">{row.acPercentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Energy vs Temperature Regression Analysis */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <CardTitle className="text-white">Energy vs Temperature Regression Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {sites.map((site) => (
                    <SelectItem key={site.value} value={site.value}>
                      {site.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-white">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-700 border-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-white">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-700 border-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Actions</Label>
              <div className="flex gap-2">
                <Button
                  onClick={fetchData}
                  disabled={!selectedSite || !startDate || !endDate || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Loading..." : "Fetch Data"}
                </Button>
                <Button
                  onClick={calculateRegression}
                  disabled={data.length === 0}
                  variant="outline"
                  className="border-slate-600"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-md">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Existing Baseline */}
          {existingBaseline && (
            <div className="p-4 bg-purple-900/30 border border-purple-700 rounded-md">
              <h4 className="font-semibold text-purple-400 mb-2">Current Baseline</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-300">Model Type: <span className="text-purple-400 capitalize">{existingBaseline.regression.type}</span></p>
                  <p className="text-slate-300">R²: <span className="text-purple-400">{existingBaseline.regression.rSquared.toFixed(4)}</span></p>
                  <p className="text-slate-300">Created: <span className="text-purple-400">{new Date(existingBaseline.createdAt).toLocaleDateString()}</span></p>
                </div>
                <div>
                  <p className="text-slate-300 mb-1">Equation:</p>
                  <code className="bg-slate-800 p-2 rounded text-cyan-400 block text-xs">
                    {existingBaseline.regression.equation}
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Debug info */}
          {data.length === 0 && !isLoading && !error && (
            <div className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-md">
              <p className="text-yellow-200">No data to display. Check console for debugging info.</p>
            </div>
          )}

          {/* Results */}
          {data.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scatter Plot */}
              <Card className="bg-slate-900/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Energy vs Temperature</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <Chart
                      type="scatter"
                      data={{
                        datasets: [
                          {
                            label: "Energy vs Temperature",
                            data: data.map(point => ({
                              x: point.temperature,
                              y: point.energy
                            })),
                            backgroundColor: "rgba(34, 211, 238, 0.6)",
                            borderColor: "rgba(34, 211, 238, 1)",
                            pointRadius: 4,
                            showLine: false,
                            type: 'scatter' as const
                          },
                          // Add regression lines
                          ...regressions.map((reg, index) => {
                            const tempRange = data.length > 0 ? {
                              min: Math.min(...data.map(p => p.temperature)),
                              max: Math.max(...data.map(p => p.temperature))
                            } : { min: 0, max: 30 }

                            // Generate 100 points for smooth line
                            const linePoints = Array.from({ length: 100 }, (_, i) => {
                              const x = tempRange.min + (tempRange.max - tempRange.min) * i / 99
                              let y: number

                              if (reg.type === 'linear') {
                                y = reg.slope * x + reg.intercept
                              } else if (reg.type === 'quadratic' && reg.coefficients) {
                                const { a, b, c } = reg.coefficients
                                y = (a || 0) * x * x + (b || 0) * x + (c || 0)
                              } else if (reg.type === 'logarithmic' && x > 0) {
                                y = reg.slope * Math.log(x) + reg.intercept
                              } else {
                                y = 0 // fallback
                              }

                              return { x, y }
                            })

                            const colors = [
                              'rgba(34, 197, 94, 1)', // green
                              'rgba(251, 191, 36, 1)', // yellow
                              'rgba(239, 68, 68, 1)'   // red
                            ]

                            return {
                              label: `${reg.type.charAt(0).toUpperCase() + reg.type.slice(1)} (R²=${reg.rSquared.toFixed(3)})`,
                              data: linePoints,
                              backgroundColor: colors[index] || 'rgba(156, 163, 175, 1)',
                              borderColor: colors[index] || 'rgba(156, 163, 175, 1)',
                              borderWidth: 2,
                              pointRadius: 0,
                              pointHoverRadius: 0,
                              showLine: true,
                              fill: false,
                              type: 'line' as const,
                              tension: 0
                            } as any
                          })
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: { color: 'white' }
                          }
                        },
                        scales: {
                          x: {
                            title: {
                              display: true,
                              text: 'Temperature (°C)',
                              color: 'white'
                            },
                            ticks: { color: 'white' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                          },
                          y: {
                            title: {
                              display: true,
                              text: `Energy (${tsdbConfig ? (() => {
                                const energyKey = sites.find(s => s.value === selectedSite)?.energyKey || ""
                                const key = Array.isArray(energyKey) ? energyKey[0] : energyKey
                                return getKeyConfig(key).unit || "kW"
                              })() : "kW"})`,
                              color: 'white'
                            },
                            ticks: { color: 'white' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Regression Results */}
              <Card className="bg-slate-900/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Regression Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Manual Model Input */}
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-md space-y-3">
                    <h4 className="font-semibold text-white">Manual Model</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                      <div className="md:col-span-2">
                        <Label className="text-slate-300">Type</Label>
                        <Select value={manualType} onValueChange={(v) => setManualType(v as any)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="linear">Linear (y = a x + b)</SelectItem>
                            <SelectItem value="quadratic">Quadratic (y = a x² + b x + c)</SelectItem>
                            <SelectItem value="logarithmic">Logarithmic (y = a*ln(x) + b)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300">a</Label>
                        <Input value={manualA} onChange={(e) => setManualA(e.target.value)} placeholder="a" className="bg-slate-700 border-slate-600" />
                      </div>
                      <div>
                        <Label className="text-slate-300">b</Label>
                        <Input value={manualB} onChange={(e) => setManualB(e.target.value)} placeholder="b" className="bg-slate-700 border-slate-600" />
                      </div>
                      {manualType === 'quadratic' && (
                        <div>
                          <Label className="text-slate-300">c</Label>
                          <Input value={manualC} onChange={(e) => setManualC(e.target.value)} placeholder="c" className="bg-slate-700 border-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => {
                          if (data.length < 3) {
                            setManualError('Need at least 3 data points to evaluate the model')
                            return
                          }
                          const a = parseFloat(manualA || '0')
                          const b = parseFloat(manualB || '0')
                          const c = parseFloat(manualC || '0')
                          const x = data.map(d => d.temperature)
                          const y = data.map(d => d.energy)
                          if (manualType === 'logarithmic' && !x.every(v => v > 0)) {
                            setManualError('Logarithmic model requires all temperatures > 0')
                            return
                          }
                          const n = y.length
                          const yMean = y.reduce((s, v) => s + v, 0) / n
                          const ssTot = y.reduce((s, yi) => s + Math.pow(yi - yMean, 2), 0)
                          const predict = (val: number) => {
                            if (manualType === 'linear') return a * val + b
                            if (manualType === 'quadratic') return a * val * val + b * val + c
                            // logarithmic
                            return a * Math.log(val) + b
                          }
                          const ssRes = y.reduce((s, yi, i) => s + Math.pow(yi - predict(x[i]), 2), 0)
                          const rSquared = 1 - (ssRes / ssTot)

                          const equation = manualType === 'linear'
                            ? `y = ${a.toFixed(6)}x + ${b.toFixed(6)}`
                            : manualType === 'quadratic'
                              ? `y = ${a.toFixed(6)}x² + ${b.toFixed(6)}x + ${c.toFixed(6)}`
                              : `y = ${a.toFixed(6)}*ln(x) + ${b.toFixed(6)}`

                          const reg: RegressionResult = manualType === 'quadratic' ? {
                            equation,
                            rSquared,
                            slope: a,
                            intercept: c,
                            type: 'quadratic',
                            coefficients: { a, b, c },
                            isManual: true
                          } : manualType === 'linear' ? {
                            equation,
                            rSquared,
                            slope: a,
                            intercept: b,
                            type: 'linear',
                            coefficients: { a, b },
                            isManual: true
                          } : {
                            equation,
                            rSquared,
                            slope: a,
                            intercept: b,
                            type: 'logarithmic',
                            coefficients: { a, b },
                            isManual: true
                          }

                          const newList = [...regressions, reg]
                          setRegressions(newList)
                          setSelectedRegressionIndex(newList.length - 1)
                          setManualError(null)
                        }}
                        disabled={data.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Preview on Chart
                      </Button>
                      <Button
                        onClick={clearManualCurves}
                        type="button"
                        variant="outline"
                        className="border-slate-600"
                        disabled={regressions.filter(r => r.isManual).length === 0}
                      >
                        Clear manual curves
                      </Button>
                      {selectedRegressionIndex !== null && (
                        <Button
                          onClick={saveBaseline}
                          disabled={isSaving}
                          variant="outline"
                          className="border-slate-600"
                        >
                          Save as Baseline
                        </Button>
                      )}
                    </div>
                    {manualError && (
                      <div className="p-2 text-sm rounded bg-red-900/40 border border-red-700 text-red-200">{manualError}</div>
                    )}
                    <p className="text-xs text-slate-400">Tip: Linear uses a (slope) and b (intercept). Quadratic uses a, b, c. Logarithmic uses a and b.</p>
                  </div>

                  {regressions.length > 0 ? (
                    <>
                      {/* Best Fit Highlight */}
                      {bestRegression && (
                        <div className="p-4 bg-green-900/30 border border-green-700 rounded-md">
                          <h4 className="font-semibold text-green-400 mb-2">Best Fit ({bestRegression.type}):</h4>
                          <code className="bg-slate-800 p-2 rounded text-cyan-400 block text-sm">
                            {bestRegression.equation}
                          </code>
                          <p className="text-green-400 mt-2">
                            R² = {bestRegression.rSquared.toFixed(4)}
                          </p>
                        </div>
                      )}

                      {/* All Results */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-white">All Models:</h4>
                        {regressions.map((reg, index) => (
                          <div key={index} className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedRegressionIndex === index
                              ? 'bg-blue-900/30 border-blue-500'
                              : index === 0
                                ? 'bg-green-900/20 border-green-700 hover:bg-green-900/30'
                                : 'bg-slate-800/50 border-slate-600 hover:bg-slate-700/50'
                          }`}
                          onClick={() => setSelectedRegressionIndex(index)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={selectedRegressionIndex === index}
                                  onChange={() => setSelectedRegressionIndex(index)}
                                  className="text-blue-500"
                                />
                                <span className="text-white capitalize font-medium">{reg.type}</span>
                                {index === 0 && <Badge variant="secondary" className="text-xs">Best</Badge>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-300">R²:</span>
                                <span className={`font-bold ${
                                  reg.rSquared > 0.8 ? 'text-green-400' :
                                  reg.rSquared > 0.6 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {reg.rSquared.toFixed(4)}
                                </span>
                              </div>
                            </div>
                            <code className="bg-slate-800 p-2 rounded text-cyan-400 block text-xs">
                              {reg.equation}
                            </code>
                          </div>
                        ))}
                      </div>

                      {/* Baseline Selection */}
                      {selectedRegressionIndex !== null && (
                        <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-md">
                          <h4 className="font-semibold text-blue-400 mb-2">Save as Baseline</h4>
                          <p className="text-sm text-slate-300 mb-3">
                            Save the selected {regressions[selectedRegressionIndex]?.type} regression as the baseline
                            model for {sites.find(s => s.value === selectedSite)?.label}. This will be used for
                            energy projection calculations.
                          </p>
                          <Button
                            onClick={saveBaseline}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isSaving ? "Saving..." : "Save as Baseline"}
                          </Button>
                        </div>
                      )}

                      {/* Save Message */}
                      {saveMessage && (
                        <div className={`p-3 rounded-md ${
                          saveMessage.includes('successfully')
                            ? 'bg-green-900/50 border border-green-700 text-green-200'
                            : 'bg-red-900/50 border border-red-700 text-red-200'
                        }`}>
                          {saveMessage}
                        </div>
                      )}

                      <Button
                        onClick={exportResults}
                        variant="outline"
                        className="w-full border-slate-600"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Results
                      </Button>
                    </>
                  ) : (
                    <p className="text-slate-400">
                      Click "Calculate" to perform regression analysis
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Data Summary */}
          {data.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white">Data Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-slate-400">Data Points</p>
                    <p className="text-2xl font-bold text-white">{data.length}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Avg Temperature</p>
                    <p className="text-2xl font-bold text-white">
                      {(data.reduce((sum, p) => sum + p.temperature, 0) / data.length).toFixed(1)}°C
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Avg Energy</p>
                    <p className="text-2xl font-bold text-white">
                      {(data.reduce((sum, p) => sum + p.energy, 0) / data.length).toFixed(2)} {tsdbConfig ? (() => {
                        const energyKey = sites.find(s => s.value === selectedSite)?.energyKey || ""
                        const key = Array.isArray(energyKey) ? energyKey[0] : energyKey
                        return getKeyConfig(key).unit || "kW"
                      })() : "kW"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Date Range</p>
                    <p className="text-sm text-white">
                      {new Date(data[0]?.timestamp * 1000).toLocaleDateString()} - {new Date(data[data.length - 1]?.timestamp * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )

  async function fetchData() {
    if (!selectedSite || !startDate || !endDate) return

    setIsLoading(true)
    setError(null)

    try {
      const site = sites.find(s => s.value === selectedSite)!
      const start = Math.floor(new Date(startDate).getTime() / 1000)
      const end = Math.floor(new Date(endDate).getTime() / 1000)

  // Normalize energy keys to an array
  const energyKeys: string[] = Array.isArray(site.energyKey) ? site.energyKey : [site.energyKey]

      console.log("Fetching energy data for keys:", energyKeys)

      // Fetch energy data for all keys (hourly max; we'll compute local-day max client-side)
      const energyResponses = await Promise.all(
        energyKeys.map((key: string) =>
          fetch("/api/tsdb", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-url": "http://35.221.150.154:5556"
            },
            body: JSON.stringify({
              operation: "read",
              key: key,
              Read: {
                start_timestamp: start,
                end_timestamp: end,
                downsampling: 3600, // 1 hour
                aggregation: "max"
              }
            })
          })
        )
      )

      // Fetch temperature data (hourly average; we'll compute local-day avg client-side)
      const tempResponse = await fetch("/api/tsdb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-url": "http://35.221.150.154:5556"
        },
        body: JSON.stringify({
          operation: "read",
          key: site.tempKey,
          Read: {
            start_timestamp: start,
            end_timestamp: end,
            downsampling: 3600, // 1 hour
            aggregation: "avg"
          }
        })
      })

      // Parse all energy responses
      const energyDataArray = await Promise.all(energyResponses.map((r: Response) => r.json()))
      const tempData = await tempResponse.json()

      console.log("Energy data responses:", energyDataArray)
      console.log("Temperature data response:", tempData)

      // Check if all requests succeeded
      if (energyDataArray.some((d: any) => !d.success) || !tempData.success) {
        throw new Error("Failed to fetch data from TSDB")
      }

      // Helper: local day start (bucket by browser/local timezone)
      const getLocalDayStart = (tsSec: number) => {
        const d = new Date(tsSec * 1000)
        d.setHours(0, 0, 0, 0)
        return Math.floor(d.getTime() / 1000)
      }

      // Build daily energy sums applying per-key multipliers/offsets
      const energyByDay = new Map<number, number>() // dayStartTs -> kWh sum
      energyDataArray.forEach((energyData: any, idx: number) => {
        const key = energyKeys[idx]
        const keyConfig = getKeyConfig(key)
        const points = energyData.data?.data || []
        console.log(`[DEBUG] Energy key ${key} (${points.length} points), keyConfig:`, keyConfig)
        // For cumulative daily-reset meters, use the max reading within the local day.
        const perDayMax = new Map<number, number>()
        points.forEach((pt: any) => {
          const day = getLocalDayStart(pt.timestamp)
          const processed = (pt.value ?? 0) * keyConfig.multiplier + keyConfig.offset
          const prev = perDayMax.get(day) ?? 0
          if (processed > prev) perDayMax.set(day, processed)
        })
        // Add this key's per-day maxima into the overall daily sum (sum across keys)
        perDayMax.forEach((val, day) => {
          energyByDay.set(day, (energyByDay.get(day) || 0) + val)
        })
      })

      // Build daily temperature averages applying multipliers/offsets
      const tempConfig = getKeyConfig(site.tempKey)
      const tempPoints = tempData.data?.data || []
      const tempAgg = new Map<number, { sum: number; count: number }>()
      tempPoints.forEach((pt: any) => {
        const day = getLocalDayStart(pt.timestamp)
        const processed = (pt.value ?? 0) * tempConfig.multiplier + tempConfig.offset
        const cur = tempAgg.get(day) || { sum: 0, count: 0 }
        cur.sum += processed
        cur.count += 1
        tempAgg.set(day, cur)
      })

      // Join on common days and produce combined datapoints
      const commonDays = Array.from(energyByDay.keys()).filter(d => tempAgg.has(d)).sort((a, b) => a - b)
      const combined: DataPoint[] = commonDays.map(day => ({
        timestamp: day,
        energy: energyByDay.get(day) || 0,
        temperature: (tempAgg.get(day)!.sum / tempAgg.get(day)!.count)
      }))

      console.log(`[DEBUG] Combined daily points: ${combined.length}`)
      console.log(`[DEBUG] Sample combined data:`, combined.slice(0, 3))

      setData(combined)
      setRegressions([]) // Reset regressions when new data is loaded
      setBestRegression(null)
      setSelectedRegressionIndex(null) // Reset selection
      setSaveMessage(null)

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  function calculateRegression() {
    if (data.length < 3) {
      setError("Need at least 3 data points for regression")
      return
    }

    const n = data.length
    const x = data.map(d => d.temperature)
    const y = data.map(d => d.energy)
    const results: RegressionResult[] = []

    // Common calculations
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
    const yMean = sumY / n
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)

    // 1. Linear Regression: y = mx + b
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    const ssResLinear = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0)
    const rSquaredLinear = 1 - (ssResLinear / ssTot)

    results.push({
      equation: `y = ${slope.toFixed(6)}x + ${intercept.toFixed(6)}`,
      rSquared: rSquaredLinear,
      slope,
      intercept,
      type: 'linear',
      coefficients: { a: slope, b: intercept },
      isManual: false
    })

    // 2. Quadratic Regression: y = ax² + bx + c
    // Use least squares with normal equations, but with better numerical stability
    try {
      const sumX3 = x.reduce((sum, xi) => sum + Math.pow(xi, 3), 0)
      const sumX4 = x.reduce((sum, xi) => sum + Math.pow(xi, 4), 0)
      const sumX2Y = x.reduce((sum, xi, i) => sum + xi * xi * y[i], 0)

      // Set up the normal equations matrix [A][coeffs] = [B]
      // where A is the coefficient matrix and B is the constants vector
      const A = [
        [n, sumX, sumX2],
        [sumX, sumX2, sumX3],
        [sumX2, sumX3, sumX4]
      ]
      const B = [sumY, sumXY, sumX2Y]

      // Solve using Gaussian elimination with partial pivoting
      const matrix = A.map((row, i) => [...row, B[i]])

      // Forward elimination with partial pivoting
      for (let i = 0; i < 3; i++) {
        // Find pivot
        let maxRow = i
        for (let k = i + 1; k < 3; k++) {
          if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
            maxRow = k
          }
        }

        // Swap rows
        [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]]

        // Check for singular matrix
        if (Math.abs(matrix[i][i]) < 1e-12) {
          throw new Error("Singular matrix")
        }

        // Make all rows below this one 0 in current column
        for (let k = i + 1; k < 3; k++) {
          const factor = matrix[k][i] / matrix[i][i]
          for (let j = i; j < 4; j++) {
            matrix[k][j] -= factor * matrix[i][j]
          }
        }
      }

      // Back substitution
      const coeffs = new Array(3)
      for (let i = 2; i >= 0; i--) {
        coeffs[i] = matrix[i][3]
        for (let j = i + 1; j < 3; j++) {
          coeffs[i] -= matrix[i][j] * coeffs[j]
        }
        coeffs[i] /= matrix[i][i]
      }

      const [c, b, a] = coeffs // c is constant, b is linear, a is quadratic

      // Calculate R-squared
      const ssResQuad = y.reduce((sum, yi, i) => sum + Math.pow(yi - (a * x[i] * x[i] + b * x[i] + c), 2), 0)
      const rSquaredQuad = 1 - (ssResQuad / ssTot)

      // Validate result
      if (isFinite(rSquaredQuad) && rSquaredQuad >= -0.1 && rSquaredQuad <= 1.1) {
        results.push({
          equation: `y = ${a.toFixed(6)}x² + ${b.toFixed(6)}x + ${c.toFixed(6)}`,
          rSquared: Math.max(0, Math.min(1, rSquaredQuad)), // Clamp to [0,1]
          slope: a, // Primary coefficient
          intercept: c,
          type: 'quadratic',
          coefficients: { a, b, c },
          isManual: false
        })
      }
    } catch (error) {
      console.warn("Quadratic regression failed:", error instanceof Error ? error.message : "Unknown error")
      // Skip quadratic if calculation fails
    }

    // 3. Logarithmic Regression: y = a*ln(x) + b
    // Only if all x values are positive
    if (x.every(xi => xi > 0)) {
      const lnX = x.map(xi => Math.log(xi))
      const sumLnX = lnX.reduce((a, b) => a + b, 0)
      const sumLnXY = lnX.reduce((sum, lnXi, i) => sum + lnXi * y[i], 0)
      const sumLnX2 = lnX.reduce((sum, lnXi) => sum + lnXi * lnXi, 0)

      const slopeLog = (n * sumLnXY - sumLnX * sumY) / (n * sumLnX2 - sumLnX * sumLnX)
      const interceptLog = (sumY - slopeLog * sumLnX) / n

      const ssResLog = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slopeLog * Math.log(x[i]) + interceptLog), 2), 0)
      const rSquaredLog = 1 - (ssResLog / ssTot)

      results.push({
        equation: `y = ${slopeLog.toFixed(6)}*ln(x) + ${interceptLog.toFixed(6)}`,
        rSquared: rSquaredLog,
        slope: slopeLog,
        intercept: interceptLog,
        type: 'logarithmic',
        coefficients: { a: slopeLog, b: interceptLog },
        isManual: false
      })
    }

    // Sort by R-squared (best fit first)
    results.sort((a, b) => b.rSquared - a.rSquared)

    setRegressions(results)
    setBestRegression(results[0] || null)
  }

  function exportResults() {
    if (regressions.length === 0 || data.length === 0) return

    const csvContent = [
      ["timestamp", "temperature", "energy"],
      ...data.map(point => [
        new Date(point.timestamp * 1000).toISOString(),
        point.temperature.toString(),
        point.energy.toString()
      ]),
      [],
      ["Regression Analysis Results"],
      ["Rank", "Type", "Equation", "R-squared", "Primary Coefficient", "Intercept"],
      ...regressions.map((reg, index) => [
        (index + 1).toString(),
        reg.type,
        reg.equation,
        reg.rSquared.toString(),
        reg.slope.toString(),
        reg.intercept.toString()
      ]),
      [],
      ["Best Fit Model"],
      ["Type", bestRegression?.type || ""],
      ["Equation", bestRegression?.equation || ""],
      ["R-squared", bestRegression?.rSquared.toString() || ""],
      [],
      ["Notes"],
      ["Models are ranked by R-squared value (higher is better)"],
      ["Linear: y = mx + b"],
      ["Quadratic: y = ax² + bx + c"],
      ["Logarithmic: y = a*ln(x) + b"]
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `regression-analysis-${selectedSite}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }
}
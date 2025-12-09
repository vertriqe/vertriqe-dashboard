"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, Download, FileText, TrendingUp, FileCode } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function BillAnalysisPage() {
  const pathname = usePathname()
  const [selectedSite, setSelectedSite] = useState("")
  const [billData, setBillData] = useState<string>("")
  const [billAnalysis, setBillAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [hourlyTempData, setHourlyTempData] = useState<string>("")
  const [existingBaseline, setExistingBaseline] = useState<any>(null)

  const sites = [
    { value: "hunt", label: "The Hunt", energyKey: ["vertriqe_25120_cctp","vertriqe_25121_cctp","vertriqe_25122_cctp","vertriqe_25123_cctp","vertriqe_25124_cctp"], tempKey: "weather_thehunt_temp_c" },
    { value: "weave", label: "Weave Studio", energyKey: ["vertriqe_25245_weave"], tempKey: "weather_thehunt_temp_c" },
    { value: "haisang", label: "Hai Sang", energyKey: ["vertriqe_24833_cctp"], tempKey: "weather_thehunt_temp_c" },
    { value: "tnl", label: "TNL", energyKey: ["vertriqe_25415_cctp", "vertriqe_25416_cctp"], tempKey: "weather_thehunt_temp_c" },
    { value: "coffee", label: "About Coffee Jeju", energyKey: ["vertriqe_25327_temperature"], tempKey: "weather_thehunt_temp_c" },
    { value: "telstar", label: "Telstar Office", energyKey: ["vertriqe_25253_cttp","vertriqe_25255_cttp","vertriqe_25256_cttp","vertriqe_25233_cttp","vertriqe_25257_cttp","vertriqe_25258_cttp"], tempKey: "weather_telstar_temp_c" }
  ]

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
        <DollarSign className="h-8 w-8 text-green-500" />
        <div>
          <h1 className="text-3xl font-bold text-white">Electric Bill Analysis</h1>
          <p className="text-slate-400">AC vs Non-AC Cost Analysis</p>
        </div>
        <Badge variant="destructive" className="ml-auto">
          Restricted Access
        </Badge>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <Link href="/super-admin/bill-analysis">
          <Button 
            variant="ghost" 
            className={`rounded-b-none ${pathname === '/super-admin/bill-analysis' ? 'border-b-2 border-green-500 text-green-400' : 'text-slate-400'}`}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Bill Analysis
          </Button>
        </Link>
        <Link href="/super-admin/regression-analysis">
          <Button 
            variant="ghost" 
            className={`rounded-b-none ${pathname === '/super-admin/regression-analysis' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-400'}`}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Regression Analysis
          </Button>
        </Link>
        <Link href="/super-admin/automation">
          <Button 
            variant="ghost" 
            className={`rounded-b-none ${pathname === '/super-admin/automation' ? 'border-b-2 border-purple-500 text-purple-400' : 'text-slate-400'}`}
          >
            <FileCode className="h-4 w-4 mr-2" />
            Automation TSV
          </Button>
        </Link>
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
    </div>
  )
}

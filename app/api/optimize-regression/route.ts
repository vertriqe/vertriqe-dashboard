import { NextRequest, NextResponse } from 'next/server'

interface DataPoint {
  temperature: number
  kwh: number
  date: string
  usedHourlyData?: boolean
  hourlyTemps?: number[]
}

interface RegressionCoefficients {
  a?: number
  b?: number
  c?: number
}

interface RegressionModel {
  type: 'linear' | 'quadratic' | 'logarithmic' | 'exponential'
  slope?: number
  intercept?: number
  coefficients?: RegressionCoefficients
  rSquared: number
}

interface OptimizationResult {
  model: RegressionModel
  monthlyResults: {
    date: string
    totalKwh: number
    expectedACKwh: number
    nonACKwh: number
    deviation: number
    temperature: number
    isValid: boolean
  }[]
  totalDeviation: number
  meanDeviation: number
  rmse: number
  maxDeviation: number
  minDeviation: number
  isValid: boolean
  invalidMonthsCount: number
}

// Regression fitting functions
function fitLinearRegression(data: DataPoint[]): RegressionModel {
  const n = data.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0

  data.forEach(point => {
    sumX += point.temperature
    sumY += point.kwh
    sumXY += point.temperature * point.kwh
    sumX2 += point.temperature * point.temperature
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Calculate R-squared
  const meanY = sumY / n
  let ssTotal = 0, ssResidual = 0

  data.forEach(point => {
    const predicted = slope * point.temperature + intercept
    ssTotal += (point.kwh - meanY) ** 2
    ssResidual += (point.kwh - predicted) ** 2
  })

  const rSquared = 1 - (ssResidual / ssTotal)

  return {
    type: 'linear',
    slope,
    intercept,
    rSquared
  }
}

function fitQuadraticRegression(data: DataPoint[]): RegressionModel {
  const n = data.length

  // Build the normal equations matrix for quadratic regression
  let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0
  let sumY = 0, sumXY = 0, sumX2Y = 0

  data.forEach(point => {
    const x = point.temperature
    const y = point.kwh
    sumX += x
    sumX2 += x * x
    sumX3 += x * x * x
    sumX4 += x * x * x * x
    sumY += y
    sumXY += x * y
    sumX2Y += x * x * y
  })

  // Solve the system of equations using matrix operations
  // [n     sumX   sumX2 ] [c]   [sumY  ]
  // [sumX  sumX2  sumX3 ] [b] = [sumXY ]
  // [sumX2 sumX3  sumX4 ] [a]   [sumX2Y]

  const denominator = n * (sumX2 * sumX4 - sumX3 * sumX3)
                     - sumX * (sumX * sumX4 - sumX2 * sumX3)
                     + sumX2 * (sumX * sumX3 - sumX2 * sumX2)

  if (Math.abs(denominator) < 1e-10) {
    // Fallback to linear if matrix is singular
    return fitLinearRegression(data)
  }

  const a = (n * (sumX2Y * sumX2 - sumXY * sumX3)
           - sumX * (sumX2Y * sumX - sumY * sumX3)
           + sumX2 * (sumXY * sumX - sumY * sumX2)) / denominator

  const b = (n * (sumXY * sumX4 - sumX2Y * sumX3)
           - sumY * (sumX * sumX4 - sumX2 * sumX3)
           + sumX2 * (sumX * sumX2Y - sumX2 * sumXY)) / denominator

  const c = (n * (sumX2 * sumX2Y - sumX3 * sumXY)
           - sumX * (sumX * sumX2Y - sumX2 * sumXY)
           + sumY * (sumX * sumX3 - sumX2 * sumX2)) / denominator

  // Calculate R-squared
  const meanY = sumY / n
  let ssTotal = 0, ssResidual = 0

  data.forEach(point => {
    const x = point.temperature
    const predicted = a * x * x + b * x + c
    ssTotal += (point.kwh - meanY) ** 2
    ssResidual += (point.kwh - predicted) ** 2
  })

  const rSquared = 1 - (ssResidual / ssTotal)

  return {
    type: 'quadratic',
    coefficients: { a, b, c },
    rSquared
  }
}

function fitLogarithmicRegression(data: DataPoint[]): RegressionModel {
  // Transform to log space: Y = a * ln(X) + b
  const validData = data.filter(point => point.temperature > 0)

  if (validData.length < 2) {
    return fitLinearRegression(data)
  }

  const n = validData.length
  let sumLnX = 0, sumY = 0, sumLnXY = 0, sumLnX2 = 0

  validData.forEach(point => {
    const lnX = Math.log(point.temperature)
    sumLnX += lnX
    sumY += point.kwh
    sumLnXY += lnX * point.kwh
    sumLnX2 += lnX * lnX
  })

  const a = (n * sumLnXY - sumLnX * sumY) / (n * sumLnX2 - sumLnX * sumLnX)
  const b = (sumY - a * sumLnX) / n

  // Calculate R-squared
  const meanY = sumY / n
  let ssTotal = 0, ssResidual = 0

  validData.forEach(point => {
    const predicted = a * Math.log(point.temperature) + b
    ssTotal += (point.kwh - meanY) ** 2
    ssResidual += (point.kwh - predicted) ** 2
  })

  const rSquared = 1 - (ssResidual / ssTotal)

  return {
    type: 'logarithmic',
    coefficients: { a, b },
    rSquared
  }
}

function fitExponentialRegression(data: DataPoint[]): RegressionModel {
  // Transform to log space: ln(Y) = bX + ln(a)
  const validData = data.filter(point => point.kwh > 0)

  if (validData.length < 2) {
    return fitLinearRegression(data)
  }

  const n = validData.length
  let sumX = 0, sumLnY = 0, sumXLnY = 0, sumX2 = 0

  validData.forEach(point => {
    const lnY = Math.log(point.kwh)
    sumX += point.temperature
    sumLnY += lnY
    sumXLnY += point.temperature * lnY
    sumX2 += point.temperature * point.temperature
  })

  const b = (n * sumXLnY - sumX * sumLnY) / (n * sumX2 - sumX * sumX)
  const lnA = (sumLnY - b * sumX) / n
  const a = Math.exp(lnA)

  // Calculate R-squared in original space
  const meanY = validData.reduce((sum, point) => sum + point.kwh, 0) / n
  let ssTotal = 0, ssResidual = 0

  validData.forEach(point => {
    const predicted = a * Math.exp(b * point.temperature)
    ssTotal += (point.kwh - meanY) ** 2
    ssResidual += (point.kwh - predicted) ** 2
  })

  const rSquared = 1 - (ssResidual / ssTotal)

  return {
    type: 'exponential',
    coefficients: { a, b },
    rSquared
  }
}

// Calculate expected AC usage using regression model
function calculateExpectedACUsage(
  model: RegressionModel,
  temperature: number,
  hoursInMonth: number,
  hourlyTemps?: number[]
): number {
  // If we have hourly temperature data, use it for more accurate prediction
  if (hourlyTemps && hourlyTemps.length > 0) {
    let hourlyACSum = 0

    hourlyTemps.forEach(temp => {
      let hourlyACPower = 0

      if (model.type === 'linear' && model.slope !== undefined && model.intercept !== undefined) {
        hourlyACPower = model.slope * temp + model.intercept
      } else if (model.type === 'quadratic' && model.coefficients) {
        const { a = 0, b = 0, c = 0 } = model.coefficients
        hourlyACPower = a * temp * temp + b * temp + c
      } else if (model.type === 'logarithmic' && model.coefficients) {
        const { a = 0, b = 0 } = model.coefficients
        hourlyACPower = temp > 0 ? a * Math.log(temp) + b : 0
      } else if (model.type === 'exponential' && model.coefficients) {
        const { a = 1, b = 0 } = model.coefficients
        hourlyACPower = a * Math.exp(b * temp)
      }

      hourlyACSum += Math.max(0, hourlyACPower)
    })

    return hourlyACSum
  }

  // Otherwise use monthly average temperature
  let hourlyACPower = 0

  if (model.type === 'linear' && model.slope !== undefined && model.intercept !== undefined) {
    hourlyACPower = model.slope * temperature + model.intercept
  } else if (model.type === 'quadratic' && model.coefficients) {
    const { a = 0, b = 0, c = 0 } = model.coefficients
    hourlyACPower = a * temperature * temperature + b * temperature + c
  } else if (model.type === 'logarithmic' && model.coefficients) {
    const { a = 0, b = 0 } = model.coefficients
    hourlyACPower = temperature > 0 ? a * Math.log(temperature) + b : 0
  } else if (model.type === 'exponential' && model.coefficients) {
    const { a = 1, b = 0 } = model.coefficients
    hourlyACPower = a * Math.exp(b * temperature)
  }

  return Math.max(0, hourlyACPower * hoursInMonth)
}

// Optimize regression model to minimize deviation from target Non-AC kWh
// Uses reverse-engineering approach: calculates synthetic AC usage from target Non-AC,
// then fits regression models to that synthetic data against temperature
function optimizeRegression(
  data: DataPoint[],
  targetNonACKwh: number
): {
  results: OptimizationResult[]
  bestModel: OptimizationResult
} {
  // Step 1: Create target AC data that would achieve the target Non-AC kWh
  // Formula: Target AC kWh = Total kWh - Target Non-AC kWh (constant)
  // This Y[i] will be used to fit regression against Temperature
  const targetACData: DataPoint[] = data.map(point => {
    const targetACKwh = point.kwh - targetNonACKwh
    return {
      temperature: point.temperature,
      kwh: targetACKwh,
      date: point.date,
      usedHourlyData: point.usedHourlyData,
      hourlyTemps: point.hourlyTemps
    }
  })

  // Step 2: Fit regression models to the target AC data
  const modelTypes: Array<'linear' | 'quadratic' | 'logarithmic' | 'exponential'> =
    ['linear', 'quadratic', 'logarithmic', 'exponential']

  const results: OptimizationResult[] = []

  modelTypes.forEach(modelType => {
    let model: RegressionModel

    // Fit model to target AC data (temperature -> target AC kWh)
    switch (modelType) {
      case 'linear':
        model = fitLinearRegression(targetACData)
        break
      case 'quadratic':
        model = fitQuadraticRegression(targetACData)
        break
      case 'logarithmic':
        model = fitLogarithmicRegression(targetACData)
        break
      case 'exponential':
        model = fitExponentialRegression(targetACData)
        break
    }

    // Step 3: Apply the fitted model to original data and calculate results
    const monthlyResults: OptimizationResult['monthlyResults'] = []
    let totalDeviation = 0
    let maxDeviation = -Infinity
    let minDeviation = Infinity
    let sumSquaredDeviation = 0
    let invalidMonthsCount = 0

    data.forEach(point => {
      const date = new Date(point.date)
      const hoursInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() * 24

      const expectedACKwh = calculateExpectedACUsage(
        model,
        point.temperature,
        hoursInMonth,
        point.hourlyTemps
      )

      const nonACKwh = point.kwh - expectedACKwh
      const deviation = Math.abs(nonACKwh - targetNonACKwh)

      // Validate: Expected AC kWh must be > 0 and < Total kWh
      const isValid = expectedACKwh > 0 && expectedACKwh < point.kwh
      if (!isValid) {
        invalidMonthsCount++
      }

      monthlyResults.push({
        date: point.date,
        totalKwh: point.kwh,
        expectedACKwh,
        nonACKwh,
        deviation,
        temperature: point.temperature,
        isValid
      })

      totalDeviation += deviation
      maxDeviation = Math.max(maxDeviation, deviation)
      minDeviation = Math.min(minDeviation, deviation)
      sumSquaredDeviation += deviation * deviation
    })

    const meanDeviation = totalDeviation / data.length
    const rmse = Math.sqrt(sumSquaredDeviation / data.length)
    const isValid = invalidMonthsCount === 0

    results.push({
      model,
      monthlyResults,
      totalDeviation,
      meanDeviation,
      rmse,
      maxDeviation,
      minDeviation,
      isValid,
      invalidMonthsCount
    })
  })

  // Filter to only valid models (where all months have valid Expected AC kWh)
  const validResults = results.filter(r => r.isValid)

  // Find best model (lowest mean absolute deviation) from valid models
  // If no valid models exist, fall back to the least invalid model
  const bestModel = validResults.length > 0
    ? validResults.reduce((best, current) =>
        current.meanDeviation < best.meanDeviation ? current : best
      )
    : results.reduce((best, current) =>
        current.invalidMonthsCount < best.invalidMonthsCount
          ? current
          : (current.invalidMonthsCount === best.invalidMonthsCount && current.meanDeviation < best.meanDeviation)
            ? current
            : best
      )

  return { results, bestModel }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, targetNonACKwh } = body

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid data: must provide array of data points' },
        { status: 400 }
      )
    }

    if (typeof targetNonACKwh !== 'number' || targetNonACKwh < 0) {
      return NextResponse.json(
        { error: 'Invalid targetNonACKwh: must be a non-negative number' },
        { status: 400 }
      )
    }

    const optimization = optimizeRegression(data, targetNonACKwh)

    return NextResponse.json(optimization)
  } catch (error) {
    console.error('Error in optimize-regression:', error)
    return NextResponse.json(
      { error: 'Failed to optimize regression model' },
      { status: 500 }
    )
  }
}

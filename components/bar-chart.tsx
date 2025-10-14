"use client"

import { useEffect, useRef } from "react"
import { Chart, type ChartConfiguration, registerables } from "chart.js"
import { cn } from "@/lib/utils"

Chart.register(...registerables)

interface BarChartProps {
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      backgroundColor: string
    }[]
  }
  className?: string
  baseline?: number[]
  showPercentage?: boolean
}

export function BarChart({ data, className, baseline, showPercentage }: BarChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const ctx = chartRef.current.getContext("2d")
    if (!ctx) return

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    // Create new chart
    const config: ChartConfiguration = {
      type: "bar",
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: showPercentage ? 100 : undefined,
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              callback: function(value: any) {
                return showPercentage ? value + '%' : value + ' kWh'
              }
            },
            title: {
              display: true,
              text: showPercentage ? 'Usage Percentage (%)' : 'Energy Usage (kWh)',
              color: "rgba(255, 255, 255, 0.7)",
            },
            stacked: true,
          },
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
            stacked: true,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
      },
    }

    chartInstanceRef.current = new Chart(ctx, config)

    // Add baseline if provided
    if (baseline && chartInstanceRef.current) {
      const chart = chartInstanceRef.current

      const originalDraw = chart.draw
      chart.draw = function () {
        originalDraw.apply(this, arguments)

        const meta = chart.getDatasetMeta(0)
        const ctx = chart.ctx

        if (!ctx) return

        ctx.save()
        ctx.strokeStyle = "white"
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()

        baseline.forEach((value, index) => {
          if (meta.data[index]) {
            const x = meta.data[index].x
            const yAxis = chart.scales.y
            const y = yAxis.getPixelForValue(value)

            if (index === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
        })

        ctx.stroke()
        ctx.restore()
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [data, baseline, showPercentage])

  return (
    <div className={cn("w-full", className)}>
      <canvas ref={chartRef}></canvas>
    </div>
  )
}

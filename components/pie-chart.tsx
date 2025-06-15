"use client"

import { useEffect, useRef } from "react"
import { Chart, type ChartConfiguration, registerables } from "chart.js"
import { cn } from "@/lib/utils"

Chart.register(...registerables)

interface PieChartProps {
  data: {
    labels: string[]
    datasets: {
      data: number[]
      backgroundColor: string[]
    }[]
  }
  className?: string
  centerText?: {
    text: string
    color: string
    fontSize: number
  }
  labels?: {
    text: string
    value: string
    position: "top-left" | "top-right" | "bottom"
  }[]
}

export function PieChart({ data, className, centerText, labels }: PieChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
      type: "doughnut",
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
          },
        },
      },
    }

    chartInstanceRef.current = new Chart(ctx, config)

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [data])

  return (
    <div className={cn("w-full h-48 relative", className)} ref={containerRef}>
      <canvas ref={chartRef}></canvas>

      {centerText && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
          <span
            style={{
              color: centerText.color,
              fontSize: `${centerText.fontSize}px`,
              fontWeight: "bold",
            }}
          >
            {centerText.text}
          </span>
        </div>
      )}

      {labels &&
        labels.map((label, index) => (
          <div
            key={index}
            className={cn(
              "absolute text-sm",
              label.position === "top-left" && "top-0 left-0",
              label.position === "top-right" && "top-0 right-0",
              label.position === "bottom" && "bottom-0 left-1/2 transform -translate-x-1/2",
            )}
          >
            <div className="font-medium">{label.text}</div>
            <div className="text-slate-300">{label.value}</div>
          </div>
        ))}
    </div>
  )
}

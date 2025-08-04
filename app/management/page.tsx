"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Thermometer, Droplets, HelpCircle, Leaf } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/user-context"
import { getCurrentFormattedDate } from "@/lib/date-utils"
import Image from "next/image"

interface ManagementData {
  date: string
  weather: {
    condition: string
    range: string
  }
  estimatedSaving: string
  zones: {
    id: number
    name: string
    temperature: string
    humidity: string
    image: string
    savingModeEnabled: boolean
  }[]
}

export default function ManagementPage() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<number | null>(null)
  const [managementData, setManagementData] = useState<ManagementData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingModeUpdating, setIsSavingModeUpdating] = useState(false)
  const { user } = useUser()
  const currentDate = getCurrentFormattedDate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/management")
        const data = await response.json()
        setManagementData(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching management data:", error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleZoneClick = (zoneId: number) => {
    setSelectedZone(zoneId)
    setSelectedFeedback(null)
    setFeedbackOpen(true)
  }

  const toggleSavingMode = async (enabled: boolean) => {
    if (!selectedZone || !managementData) return

    setIsSavingModeUpdating(true)

    try {
      // Make API call to toggle saving mode
      const response = await fetch("/api/management/toggle-saving-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          zoneId: selectedZone,
          enabled,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update local state
        const updatedZones = managementData.zones.map((zone) =>
          zone.id === selectedZone ? { ...zone, savingModeEnabled: enabled } : zone,
        )

        setManagementData({
          ...managementData,
          zones: updatedZones,
        })
      }
    } catch (error) {
      console.error("Error toggling saving mode:", error)
    } finally {
      setIsSavingModeUpdating(false)
    }
  }

  const getSelectedZoneSavingMode = () => {
    if (!selectedZone || !managementData) return false
    const zone = managementData.zones.find((z) => z.id === selectedZone)
    return zone?.savingModeEnabled || false
  }

  if (isLoading || !managementData) {
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
            <h2 className="text-3xl font-bold mt-2">Management Overview</h2>
          </div>
          <div className="text-right text-slate-300">
            <p>{currentDate}</p>
            <p>{managementData.weather.condition}</p>
            <p>{managementData.weather.range}</p>
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <Card className="bg-slate-800 border-slate-700 w-48">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                <span className="text-sm">Estimated Saving</span>
              </div>
              <div className="text-3xl font-bold">{managementData.estimatedSaving}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementData.zones.map((zone) => (
            <div
              key={zone.id}
              className="relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleZoneClick(zone.id)}
            >
              <div className="absolute inset-0 bg-black/50 z-10"></div>
              <img src={zone.image || "/placeholder.svg"} alt={zone.name} className="w-full h-40 object-cover" />
              <div className="absolute inset-0 z-20 p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-semibold">{zone.name}</h3>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 bg-slate-700/50">
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex items-center">
                    <Thermometer className="h-5 w-5 mr-1" />
                    <span className="text-lg">{zone.temperature}</span>
                  </div>
                  <div className="flex items-center">
                    <Droplets className="h-5 w-5 mr-1" />
                    <span className="text-lg">{zone.humidity}</span>
                  </div>
                  {zone.savingModeEnabled && (
                    <div className="absolute top-4 right-12 bg-green-500/80 rounded-full p-1">
                      <Leaf className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Feedback Dialog */}
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">
                How are you feeling in {selectedZone && managementData.zones.find((z) => z.id === selectedZone)?.name}?
              </DialogTitle>
            </DialogHeader>

            {/* Saving Mode Toggle */}
            <div className="flex items-center justify-between py-4 px-2 bg-slate-700/50 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <Leaf className="h-5 w-5 text-green-500" />
                <Label htmlFor="saving-mode" className="text-sm font-medium">
                  Saving Mode
                </Label>
              </div>
              <div className="flex items-center">
                <Switch
                  id="saving-mode"
                  checked={getSelectedZoneSavingMode()}
                  onCheckedChange={toggleSavingMode}
                  disabled={isSavingModeUpdating}
                  className="data-[state=checked]:bg-green-500"
                />
                {isSavingModeUpdating && (
                  <div className="ml-2 animate-spin h-4 w-4 border-2 border-green-500 rounded-full border-t-transparent"></div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4">
              <Button
                variant={selectedFeedback === "hot" ? "default" : "secondary"}
                className={`rounded-full ${selectedFeedback === "hot" ? "bg-red-500" : "bg-slate-600"}`}
                onClick={() => setSelectedFeedback("hot")}
              >
                Too Hot
              </Button>
              <Button
                variant={selectedFeedback === "stuffy" ? "default" : "secondary"}
                className={`rounded-full ${selectedFeedback === "stuffy" ? "bg-orange-500" : "bg-slate-600"}`}
                onClick={() => setSelectedFeedback("stuffy")}
              >
                Too Stuffy
              </Button>
              <Button
                variant={selectedFeedback === "windy" ? "default" : "secondary"}
                className={`rounded-full ${selectedFeedback === "windy" ? "bg-blue-500" : "bg-slate-600"}`}
                onClick={() => setSelectedFeedback("windy")}
              >
                Too Windy
              </Button>
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                variant="default"
                className="bg-blue-500 hover:bg-blue-600"
                onClick={() => setFeedbackOpen(false)}
              >
                Confirm
              </Button>
              <Button variant="secondary" className="bg-slate-600" onClick={() => setFeedbackOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Shield, TrendingUp, DollarSign, FileCode, Save, RefreshCw } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function AutomationPage() {
  const pathname = usePathname()
  const { toast } = useToast()
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const fetchConfig = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/automation-config")
      const data = await response.json()
      if (data.content !== undefined) {
        setContent(data.content)
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load automation configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/automation-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) throw new Error("Failed to save")

      toast({
        title: "Success",
        description: "Automation configuration saved successfully",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to save automation configuration",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
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

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCode className="h-6 w-6 text-purple-400" />
            <CardTitle className="text-white">Automation TSV Configuration</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchConfig} disabled={isLoading || isSaving}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isLoading || isSaving} className="bg-purple-600 hover:bg-purple-700">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-slate-400 mb-2">
              Edit the content for the <code>vertriqe_automation_tsv</code> Redis key.
            </p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono min-h-[500px] bg-slate-950 border-slate-800 text-slate-200"
              placeholder="Paste TSV content here..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

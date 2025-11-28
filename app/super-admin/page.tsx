"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, TrendingUp, DollarSign } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function SuperAdminPage() {
  const pathname = usePathname()

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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Electric Bill Analysis Card */}
        <Link href="/super-admin/bill-analysis">
          <Card className="bg-gradient-to-br from-green-900/30 to-blue-900/30 border-green-700 hover:border-green-500 transition-all cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-400" />
                <CardTitle className="text-white text-xl">Bill Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 text-sm">
                Analyze electric bills to separate AC and non-AC costs using regression models.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Energy vs Temperature Regression Analysis Card */}
        <Link href="/super-admin/regression-analysis">
          <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700 hover:border-blue-500 transition-all cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-400" />
                <CardTitle className="text-white text-xl">Regression Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 text-sm">
                Create regression models to predict energy consumption based on temperature.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

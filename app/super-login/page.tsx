"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react"

interface User {
  name: string
  email: string
}

export default function SuperLoginPage() {
  const [selectedEmail, setSelectedEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const router = useRouter()

  // Load available users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/auth/super-login")
        const data = await response.json()
        setUsers(data.users || [])
      } catch (error) {
        console.error("Error fetching users:", error)
        setError("Failed to load available users")
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/verify")
        const data = await response.json()

        if (data.authenticated) {
          // User is already logged in, redirect to dashboard
          window.location.href = "/"
        }
      } catch (error) {
        // User is not authenticated, stay on super login page
        console.log("User not authenticated")
      }
    }

    checkAuth()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!selectedEmail) {
      setError("Please select a user to impersonate")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/super-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: selectedEmail, password, rememberMe }),
      })

      const data = await response.json()

      if (response.ok) {
        // Clear any existing error
        setError("")
        // Force a hard redirect to ensure middleware runs
        window.location.href = "/"
      } else {
        setError(data.message || "Super admin login failed")
      }
    } catch (error) {
      console.error("Super admin login error:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23334155' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Super Admin</h1>
              <p className="text-red-400 text-sm font-medium">Restricted Access Portal</p>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/80 border-red-700/50 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-center text-white mb-2">Super Admin Login</CardTitle>
            <p className="text-center text-slate-400 text-sm">Impersonate any user with super admin privileges</p>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200 font-medium">
                  Select User to Impersonate
                </Label>
                {loadingUsers ? (
                  <div className="flex items-center justify-center p-3 bg-slate-700/80 border border-slate-600 rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400 mr-2" />
                    <span className="text-slate-400">Loading users...</span>
                  </div>
                ) : (
                  <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                    <SelectTrigger className="bg-slate-700/80 border-slate-600 text-white h-12">
                      <SelectValue placeholder="Choose a user to impersonate" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {users.map((user) => (
                        <SelectItem 
                          key={user.email} 
                          value={user.email}
                          className="text-white hover:bg-slate-700"
                        >
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200 font-medium">
                  Super Admin Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-400 focus:border-red-400 focus:ring-red-400/20 h-12 pr-12"
                    placeholder="Enter super admin password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500 focus:ring-offset-slate-800"
                />
                <Label htmlFor="rememberMe" className="text-slate-300 text-sm cursor-pointer">
                  Keep me signed in for 30 days
                </Label>
              </div>

              {error && (
                <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium h-12 transition-colors"
                disabled={isLoading || !selectedEmail}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Access Super Admin Mode"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-center text-slate-400 text-xs">
                This is a restricted access portal. Unauthorized access is prohibited.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

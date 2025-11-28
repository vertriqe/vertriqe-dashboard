"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Loader2, Zap } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

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
        // User is not authenticated, stay on login page
        console.log("User not authenticated")
      }
    }

    checkAuth()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe }),
      })

      const data = await response.json()

      if (response.ok) {
        // Clear any existing error
        setError("")
        // Force a hard redirect to ensure middleware runs
        window.location.href = "/"
      } else {
        setError(data.message || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-6xl flex items-center justify-between gap-12 relative z-10">
        {/* Left Side - Brand & Features */}
        <div className="flex-1 hidden lg:block">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <Image
                src="/images/vertriqe-logo.png"
                alt="VERTRIQE Logo"
                width={240}
                height={72}
                className="h-auto filter brightness-0 invert"
                priority
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">ADEST</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              AI-Driven Energy Saving Technology Dashboard
            </p>
          </div>

        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md lg:max-w-lg">
          {/* Mobile Logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/vertriqe-logo.png"
                alt="VERTRIQE Logo"
                width={200}
                height={60}
                className="h-auto filter brightness-0 invert"
                priority
              />
            </div>
            <p className="text-slate-400">AI-Driven Energy Saving Technology</p>
          </div>

          <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-center text-white mb-2">Sign In</CardTitle>
              <p className="text-center text-slate-400 text-sm">Access your energy dashboard</p>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200 font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-12"
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200 font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-12 pr-12"
                      placeholder="Enter your password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 px-3 text-slate-400 hover:text-white hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label 
                    htmlFor="rememberMe" 
                    className="text-slate-300 text-sm font-medium cursor-pointer"
                  >
                    Remember me (keep me signed in)
                  </Label>
                </div>

                {error && (
                  <Alert className="bg-red-900/50 border-red-700/50">
                    <AlertDescription className="text-red-200">{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold h-12 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
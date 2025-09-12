"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { UserProvider } from "@/contexts/user-context"
import "@/app/globals.css"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      {isLoginPage ? (
        // Login page without sidebar
        children
      ) : (
        // Protected pages with sidebar
        <UserProvider>
          <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 right-20 w-80 h-80 bg-cyan-500 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-500 rounded-full blur-3xl"></div>
            </div>
            <Sidebar />
            <main className="flex-1 overflow-auto relative">{children}</main>
          </div>
        </UserProvider>
      )}
    </ThemeProvider>
  )
}

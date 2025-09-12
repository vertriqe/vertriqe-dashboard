"use client"

import { Home, Briefcase, Users, Zap, BarChart3, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogoutButton } from "./logout-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import Image from "next/image"

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const isHuntUser = user?.name === "The Hunt"
  const isWeaveUser = user?.name === "Weave Studio"

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Dashboard",
      isActive: pathname === "/",
      disabled: false,
    },
    {
      href: "/energy",
      icon: Zap,
      label: "Energy Dashboard",
      isActive: pathname === "/energy",
      disabled: false,
    },
    {
      href: "/performance",
      icon: BarChart3,
      label: "Performance",
      isActive: pathname === "/performance",
      disabled: false,
    },
    {
      href: "/management",
      icon: Briefcase,
      label: "Management",
      isActive: pathname === "/management",
      disabled: false,
    },
    {
      href: "/users",
      icon: Users,
      label: "User Management",
      isActive: pathname === "/users",
      disabled: true,
    },
  ]

  return (
    <div className="w-20 bg-slate-900/80 h-full flex flex-col items-center py-6 border-r border-slate-700/50 relative">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
      


      {/* Navigation items */}
      <div className="flex-1 flex flex-col gap-3 relative z-10">
        {navItems.map((item) => {
          const IconComponent = item.icon
          
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="relative group"
                title={`${item.label} (Coming Soon)`}
              >
                <Button
                  variant="ghost"
                  className="w-12 h-12 rounded-xl cursor-not-allowed opacity-40 text-slate-500 bg-slate-800/30"
                  disabled
                >
                  <IconComponent className="h-5 w-5" />
                </Button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              </div>
            )
          }
          
          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative overflow-hidden",
                  item.isActive 
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 scale-105" 
                    : "bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-white hover:scale-105"
                )}
                title={item.label}
              >
                {item.isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-20 animate-pulse rounded-xl" />
                )}
                <IconComponent className="h-5 w-5 relative z-10" />
              </Link>
              
              {/* Tooltip */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* User info and logout */}
      <div className="mt-auto relative z-10 flex flex-col items-center gap-3">

        <LogoutButton />
      </div>
    </div>
  )
}

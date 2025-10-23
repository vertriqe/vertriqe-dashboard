"use client"

import { useState, useEffect } from "react"
import { UserCog, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser } from "@/contexts/user-context"

interface User {
  name: string
  email: string
}

const SUPER_ADMIN_PASSWORD = "dxSFOKT4ElXdCXTTtGkB"

export function SuperAdminSwitcher() {
  const { user, isSuperAdmin } = useUser()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers()
    }
  }, [isSuperAdmin])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/super-login")
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const switchToUser = async (email: string) => {
    if (email === user?.email) {
      // Already impersonating this user
      return
    }

    setIsSwitching(true)
    try {
      const response = await fetch("/api/auth/super-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: SUPER_ADMIN_PASSWORD,
          rememberMe: false,
        }),
      })

      if (response.ok) {
        // Reload the page to refresh the user context
        window.location.reload()
      } else {
        console.error("Failed to switch user")
        setIsSwitching(false)
      }
    } catch (error) {
      console.error("Error switching user:", error)
      setIsSwitching(false)
    }
  }

  if (!isSuperAdmin) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 relative group"
          title="Switch User (Super Admin)"
          disabled={isSwitching}
        >
          {isSwitching ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <UserCog className="h-5 w-5" />
          )}
          {/* Tooltip */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            Switch User
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="right"
        className="w-64 bg-slate-800 border-slate-700"
      >
        <DropdownMenuLabel className="text-red-400 font-semibold">
          Super Admin Mode
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        <div className="px-2 py-1.5 text-xs text-slate-400">
          Current: {user?.name}
        </div>
        <DropdownMenuSeparator className="bg-slate-700" />
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {users.map((u) => (
              <DropdownMenuItem
                key={u.email}
                onClick={() => switchToUser(u.email)}
                disabled={u.email === user?.email}
                className={`cursor-pointer ${
                  u.email === user?.email
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-slate-200 hover:bg-slate-700"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-xs text-slate-400">{u.email}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

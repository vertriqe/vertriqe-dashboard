"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MoreHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface User {
  id: number
  name: string
  email: string
  role: string
  status: "active" | "inactive"
  lastActive: string
  avatar?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    // Simulate API call
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users")
        const data = await response.json()
        setUsers(data.users)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching users:", error)
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const filteredUsers =
    activeTab === "all"
      ? users
      : users.filter((user) => (activeTab === "active" ? user.status === "active" : user.status === "inactive"))

  return (
    <div className="bg-slate-900 min-h-screen p-6 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Hello VERTRIQUE</h1>
            <h2 className="text-3xl font-bold mt-2">User Management</h2>
          </div>
          <div className="text-right text-slate-300">
            <p>6 May 2024</p>
            <p>Cloudy</p>
            <p>28/31°C</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search users..." className="pl-10 bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
              <TabsList className="bg-slate-700 w-full md:w-auto">
                <TabsTrigger value="all" className="data-[state=active]:bg-slate-600">
                  All Users
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-slate-600">
                  Active
                </TabsTrigger>
                <TabsTrigger value="inactive" className="data-[state=active]:bg-slate-600">
                  Inactive
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-300">User</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-300">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-300">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-300">Last Active</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-blue-500">{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">{user.role}</td>
                        <td className="py-3 px-4">
                          <Badge className={user.status === "active" ? "bg-green-500" : "bg-slate-500"}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{user.lastActive}</td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white">
                              <DropdownMenuItem className="hover:bg-slate-700">Edit</DropdownMenuItem>
                              <DropdownMenuItem className="hover:bg-slate-700">Permissions</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-500 hover:bg-slate-700 hover:text-red-500">
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { NextResponse } from "next/server"

export async function GET() {
  const users = [
    {
      id: 1,
      name: "Alex Wong",
      email: "alex.wong@vertrique.com",
      role: "Admin",
      status: "active",
      lastActive: "Just now",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 2,
      name: "Sarah Chen",
      email: "sarah.chen@vertrique.com",
      role: "Manager",
      status: "active",
      lastActive: "2 hours ago",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 3,
      name: "Michael Liu",
      email: "michael.liu@vertrique.com",
      role: "Technician",
      status: "active",
      lastActive: "Yesterday",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 4,
      name: "Jessica Tan",
      email: "jessica.tan@vertrique.com",
      role: "Analyst",
      status: "inactive",
      lastActive: "3 days ago",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 5,
      name: "David Kim",
      email: "david.kim@vertrique.com",
      role: "Technician",
      status: "active",
      lastActive: "1 hour ago",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 6,
      name: "Emily Zhang",
      email: "emily.zhang@vertrique.com",
      role: "Manager",
      status: "inactive",
      lastActive: "1 week ago",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ]

  return NextResponse.json({ users })
}

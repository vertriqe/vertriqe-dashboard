import type React from "react"
import ClientLayout from "./clientLayout"
import './globals.css'

export const metadata = {
  title: 'VERTRIQE Adest',
  description: 'AI-Driven Energy Saving Technology',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}

// app/(admin)/admin/layout.tsx
// Isolated admin layout — dark-only, no video bg, no Navbar, no Footer

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import AdminSidebar from "./components/AdminSidebar"
import AdminHeader from "./components/AdminHeader"
import "../../globals.css"

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "S&G Studios — Admin Dashboard",
  description: "Admin dashboard for S&G Entertainment studio booking system.",
  robots: "noindex, nofollow",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} style={{ colorScheme: "dark" }}>
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body className={`${inter.className} admin-body`}>
        {/* Deep dark mesh gradient background */}
        <div className="admin-mesh-bg" aria-hidden="true" />

        <div className="relative z-10 flex h-screen overflow-hidden">
          <AdminSidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}

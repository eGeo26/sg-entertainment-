// app/admin/layout.tsx
// Isolated admin layout — no video bg, no Navbar, no Footer from root

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import AdminSidebar from "./components/AdminSidebar"
import AdminHeader from "./components/AdminHeader"

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
    <div className={`${inter.variable} ${inter.className} flex h-screen bg-[#070707] text-[#F5F5F5] overflow-hidden relative light:bg-white light:text-gray-900`}>

      {/* Content wrapper with higher z-index */}
      <div className="relative z-10 flex h-full w-full overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

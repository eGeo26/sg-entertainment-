"use client"
// app/(admin)/admin/layout.tsx
// Dashboard layout wrapper — client component to toggle sidebar/header/bottom nav on login page

import { usePathname } from "next/navigation"
import { useState } from "react"
import AdminSidebar from "./components/AdminSidebar"
import AdminHeader from "./components/AdminHeader"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/admin/login"
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="admin-body min-h-screen relative overflow-hidden text-[#F5F5F5] bg-[#161619]">
      {/* Deep dark mesh gradient background */}
      <div className="admin-mesh-bg" aria-hidden="true" />

      <div className="relative z-10 flex h-screen overflow-hidden">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AdminHeader onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-4 md:pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

"use client"
// app/(admin)/admin/layout.tsx
// Dashboard layout wrapper — client component to toggle sidebar/header on login page

import { usePathname } from "next/navigation"
import AdminSidebar from "./components/AdminSidebar"
import AdminHeader from "./components/AdminHeader"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/admin/login"

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="admin-body min-h-screen relative overflow-hidden text-[#F5F5F5] bg-[#0A0A0A]">
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
    </div>
  )
}

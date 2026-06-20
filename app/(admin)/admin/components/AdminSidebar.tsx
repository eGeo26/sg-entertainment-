"use client"
// app/admin/components/AdminSidebar.tsx

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import { toast } from "sonner"

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Overview",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/reviews",
    label: "Reviews",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c-.107-.218-.392-.218-.5 0l-2.36 4.817a.25.25 0 01-.188.136l-5.314.771c-.24.035-.336.33-.162.5l3.844 3.747a.25.25 0 01.072.222l-.908 5.293c-.041.242.213.428.43.313l4.745-2.496a.25.25 0 01.228 0l4.746 2.496c.217.115.472-.07.43-.313l-.908-5.293a.25.25 0 01.072-.222l3.844-3.747c.174-.17.078-.465-.162-.51l-5.314-.771a.25.25 0 01-.188-.136l-2.36-4.817z" />
      </svg>
    ),
  },
  {
    href: "/admin/insights",
    label: "Insights",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  const [systemStatus, setSystemStatus] = useState({ isPlaceholderDb: true })

  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem("admin-sidebar-collapsed")
    if (stored === "true") {
      setCollapsed(true)
    }

    async function fetchStatus() {
      try {
        const res = await fetch("/api/admin/status")
        if (res.ok) {
          const data = await res.json()
          setSystemStatus(data)
        }
      } catch (err) {
        console.error("Failed to query status endpoint", err)
      }
    }
    fetchStatus()
  }, [])

  useEffect(() => {
    const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000

    const checkInactivity = () => {
      const sessionStart = localStorage.getItem("slay_admin_session")
      if (sessionStart) {
        const elapsed = Date.now() - parseInt(sessionStart)
        if (elapsed > INACTIVITY_TIMEOUT) {
          localStorage.removeItem("slay_admin_session")
          localStorage.removeItem("slay_admin_password")
          toast.warning("Session expired due to 8 hours of inactivity. Logging out...")
          signOut({ callbackUrl: "/admin/login" })
        }
      }
    }

    const resetTimer = () => {
      localStorage.setItem("slay_admin_session", Date.now().toString())
    }

    checkInactivity()

    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, resetTimer))

    const interval = setInterval(checkInactivity, 60000)

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      clearInterval(interval)
    }
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("admin-sidebar-collapsed", String(next))
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isCollapsed = collapsed && !isMobile
    return (
      <div className="flex flex-col h-full">
        <div className={`py-6 border-b border-white/5 transition-all duration-300 ${isCollapsed ? "px-4" : "px-6"}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            {isCollapsed ? (
              <span className="text-white font-bold text-sm tracking-wider">S&amp;G</span>
            ) : (
              <div className="whitespace-nowrap overflow-hidden transition-all duration-300">
                <p className="text-sm font-bold tracking-widest uppercase text-white">S&amp;G Studios</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${systemStatus.isPlaceholderDb ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
                  <span className="text-[8px] text-white/40 tracking-wider uppercase font-bold">
                    {systemStatus.isPlaceholderDb ? "Offline Mode" : "Cloud Connected"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto transition-all duration-300 ${isCollapsed ? "px-2" : "px-3"}`}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-lg text-sm transition-all duration-150 group ${
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-white/10 text-white border-l-2 border-white pl-[10px]"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <span className={`flex-shrink-0 ${active ? "text-white" : "text-white/40 group-hover:text-white/60"}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="font-medium tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {!isMobile && (
          <div className="hidden md:block border-t border-white/5 p-3">
            <button
              onClick={toggleCollapse}
              className={`flex items-center rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 w-full transition-all duration-150 ${
                isCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2.5"
              }`}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="flex-shrink-0">
                {isCollapsed ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                  </svg>
                )}
              </span>
              {!isCollapsed && <span className="font-medium tracking-wide">Collapse Sidebar</span>}
            </button>
          </div>
        )}

        <div className={`py-4 border-t border-white/5 transition-all duration-300 ${isCollapsed ? "px-2 text-center" : "px-6"}`}>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className={`flex items-center text-[#C8102E] hover:text-red-400 text-xs font-semibold uppercase tracking-wider py-1.5 rounded w-full transition-colors ${
              isCollapsed ? "justify-center" : "gap-2"
            }`}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            {!isCollapsed && <span>Log Out</span>}
          </button>
          <p className="text-[10px] text-white/20 tracking-widest uppercase mt-3">
            {isCollapsed ? "v1.0" : "S&G Admin v1.0"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <aside className={`hidden md:flex flex-col bg-black/30 backdrop-blur-xl border-r border-white/5 flex-shrink-0 transition-all duration-300 ease-in-out ${
        isMounted && collapsed ? "w-[72px]" : "w-60"
      }`}>
        <SidebarContent />
      </aside>

      <button
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center text-white/70 hover:text-white"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#0F0F0F] border-r border-white/10 flex flex-col transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <span className="text-sm font-bold tracking-wider text-white uppercase">S&amp;G Admin</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarContent isMobile />
      </aside>
    </>
  )
}

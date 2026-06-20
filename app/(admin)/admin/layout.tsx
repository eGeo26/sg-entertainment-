// app/(admin)/admin/layout.tsx
// Isolated admin layout — no video bg, no Navbar, no Footer from root

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
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Default to system preference; JS will override with stored value */}
        <meta name="color-scheme" content="light dark" />
        {/* FOUC prevention: restore stored theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var t = localStorage.getItem('sg-admin-theme');
    var root = document.documentElement;
    if (t === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else if (t === 'light') {
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  } catch(e) {}
})();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} admin-body`}>
        {/* Adaptive mesh gradient background */}
        <div className="admin-mesh-bg" aria-hidden="true" />

        <div className="relative z-10 flex h-screen overflow-hidden" style={{ color: "var(--text-primary)" }}>
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

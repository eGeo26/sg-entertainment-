// app/(admin)/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "@/app/globals.css"

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

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-[#0A0A0A] text-[#F5F5F5]`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

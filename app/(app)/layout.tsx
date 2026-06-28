// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import "../globals.css"

import BackgroundVideo from "@/components/BackgroundVideo"

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "S&G Studios — Book a Professional Recording Session",
  description:
    "Book your professional recording session at S&G Studios, Accra. Expert engineers, state-of-the-art equipment. Pay securely via Paystack.",
  keywords: "recording studio, Accra, Ghana, music production, S&G Studios, mixing, mastering, sound engineering",
  openGraph: {
    title: "S&G Studios — Professional Recording Studio, Accra",
    description: "Expert recording, mixing, and mastering in Accra. Book now.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>

        {/* ── Universal video background (persists across all pages) ── */}
        <BackgroundVideo />

        {/* ── Universal Navbar ─────────────────────────────────────── */}
        <Navbar />

        {/* ── Page content ─────────────────────────────────────────── */}
        <div className="relative z-10 pt-14 min-h-screen flex flex-col">
          {children}
        </div>

        {/* ── Universal Footer ─────────────────────────────────────── */}
        <Footer />

        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

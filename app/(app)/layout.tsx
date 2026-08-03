// app/layout.tsx
import type { Metadata, Viewport } from "next"
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL("https://sngent.com"),
  title: "S&G Studios | Book a Professional Recording Session",
  description:
    "Book your professional recording session at S&G Studios, Accra. Expert engineers, state-of-the-art equipment. Pay securely via Hubtel.",
  keywords: "recording studio, Accra, Ghana, music production, S&G Studios, mixing, mastering, sound engineering",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "S&G Studios | Professional Recording Studio, Accra",
    description: "Expert recording, mixing, and mastering in Accra. Book now.",
    url: "https://sngent.com",
    siteName: "S&G Studios",
    images: [
      {
        url: "/assets/og-image.png",
        width: 1200,
        height: 630,
        alt: "S&G Studios — Professional Recording Studio, Accra",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "S&G Studios | Professional Recording Studio, Accra",
    description: "Expert recording, mixing, and mastering in Accra. Book now.",
    images: ["/assets/og-image.png"],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} overflow-x-hidden`}>

        {/* ── Universal video background (persists across all pages) ── */}
        <BackgroundVideo />

        {/* ── Universal Navbar ─────────────────────────────────────── */}
        <Navbar />

        {/* ── Page content ─────────────────────────────────────────── */}
        <div className="relative z-10 pt-14 min-h-[100dvh] flex flex-col">
          {children}
        </div>

        {/* ── Universal Footer ─────────────────────────────────────── */}
        <Footer />

        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

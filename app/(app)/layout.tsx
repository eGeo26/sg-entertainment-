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
    // Increment this version whenever app/favicon.ico changes.
    icon: "/favicon.ico?v=1",
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
  // LocalBusiness structured data — reads from NEXT_PUBLIC_STUDIO_* env vars.
  // Update the env vars with real values before final deployment.
  const studioName     = process.env.NEXT_PUBLIC_STUDIO_NAME     ?? "S&G Entertainment"
  const studioLocation = process.env.NEXT_PUBLIC_STUDIO_LOCATION ?? "Taifa, Accra, Ghana"
  const studioPhone    = process.env.NEXT_PUBLIC_STUDIO_PHONE    ?? ""
  const studioEmail    = process.env.NEXT_PUBLIC_STUDIO_EMAIL    ?? ""
  const appUrl         = "https://sngent.com"

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "MusicStore",
    "additionalType": "RecordingStudio",
    "name": studioName,
    "description": "Professional recording studio offering music recording, mixing, mastering, and full production services in Accra, Ghana.",
    "url": appUrl,
    "telephone": studioPhone,
    "email": studioEmail,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Accra",
      "addressRegion": "Greater Accra",
      "addressCountry": "GH",
      "streetAddress": studioLocation,
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "5.6037",
      "longitude": "-0.1870",
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"
      ],
      "opens": "00:00",
      "closes": "23:59",
    },
    "priceRange": "GHS 300+",
    "currenciesAccepted": "GHS",
    "paymentAccepted": "Mobile Money, Card",
    "image": `${appUrl}/assets/og-image.png`,
    "logo": `${appUrl}/assets/sg-logo.png`,
    "sameAs": [],
  }

  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} overflow-x-hidden`}>

        {/* ── LocalBusiness JSON-LD structured data ──────────────────── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />

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


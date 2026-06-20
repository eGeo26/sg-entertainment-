// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  env: {
    NEXT_PUBLIC_HOURLY_RATE: process.env.NEXT_PUBLIC_HOURLY_RATE || "200",
    NEXT_PUBLIC_MIN_HOURS: process.env.NEXT_PUBLIC_MIN_HOURS || "2",
    NEXT_PUBLIC_MAX_HOURS: process.env.NEXT_PUBLIC_MAX_HOURS || "12",
    NEXT_PUBLIC_BOOKING_LEAD_HOURS: process.env.NEXT_PUBLIC_BOOKING_LEAD_HOURS || "2",
  },
}

export default nextConfig

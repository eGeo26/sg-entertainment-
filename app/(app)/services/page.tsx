// app/(app)/services/page.tsx
// Server Component wrapper — exports metadata, delegates rendering to ServicesContent (client component)
import type { Metadata } from "next"
import ServicesContent from "./ServicesContent"

export const metadata: Metadata = {
  title: "Studio Services & Packages | S&G Studios, Accra",
  description:
    "Explore our professional in-studio and remote services: music recording, mixing, mastering, and full production packages in Accra, Ghana. Transparent pricing starting from GHS 300.",
  openGraph: {
    title: "Studio Services & Packages | S&G Studios, Accra",
    description:
      "Recording, mixing, mastering, and full production. In-studio and remote options available. Accra, Ghana.",
    url: "https://sngent.com/services",
  },
}

export default function ServicesPage() {
  return <ServicesContent />
}

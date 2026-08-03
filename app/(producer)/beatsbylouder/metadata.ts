// app/(producer)/beatsbylouder/metadata.ts
// Explicit noindex for the producer portal — belt-and-suspenders alongside layout.tsx robots metadata.
import type { Metadata } from "next"

export const producerPortalMetadata: Metadata = {
  title: "Producer Portal",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

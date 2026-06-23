"use client"

import Image from "next/image"

export default function PromoFlyer() {
  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl overflow-hidden select-none">
      <Image
        src="/assets/promo-flyer.jpg"
        alt="S&G Music Recording Promo"
        width={800}
        height={1000}
        className="w-full h-auto object-contain rounded-2xl"
        priority
      />
    </div>
  )
}

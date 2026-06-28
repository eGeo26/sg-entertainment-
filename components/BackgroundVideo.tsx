"use client"

import { useEffect, useRef } from "react"

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Ensure all mobile autoplay flags are explicitly set on DOM node
    video.muted = true
    video.defaultMuted = true
    video.setAttribute("playsinline", "true")
    video.setAttribute("webkit-playsinline", "true")

    const attemptPlay = () => {
      if (video.paused) {
        video.play().catch(() => {
          // Ignore autoplay restriction errors until interaction
        })
      }
    }

    // Attempt initial play
    attemptPlay()

    // Listen for any mobile user gesture to unpause instantly if browser blocked initial autoplay
    const events = ["touchstart", "touchmove", "pointerdown", "scroll", "click"]
    const handleInteraction = () => {
      attemptPlay()
    }

    events.forEach((evt) => window.addEventListener(evt, handleInteraction, { passive: true }))

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleInteraction))
    }
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover"
      >
        <source src="/assets/studio-bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/90" />
    </div>
  )
}

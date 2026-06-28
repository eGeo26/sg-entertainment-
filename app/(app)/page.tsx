"use client"
// app/(app)/page.tsx

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import PromoFlyer from "@/components/PromoFlyer"

interface Review {
  id: string
  name: string
  socialHandle: string | null
  rating: number
  text: string
  createdAt: string
}

import { useRef } from "react"

export default function HomePage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Review Form States
  const [name, setName] = useState("")
  const [socialHandle, setSocialHandle] = useState("")
  const [rating, setRating] = useState(5)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Auto-slide every 5s
  useEffect(() => {
    if (reviews.length <= 1) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % reviews.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [reviews])

  // Scroll to active index
  useEffect(() => {
    if (carouselRef.current) {
      const child = carouselRef.current.children[activeIndex] as HTMLElement
      if (child) {
        carouselRef.current.scrollTo({
          left: child.offsetLeft,
          behavior: "smooth",
        })
      }
    }
  }, [activeIndex])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const index = Math.round(container.scrollLeft / container.clientWidth)
    if (index !== activeIndex && index >= 0 && index < reviews.length) {
      setActiveIndex(index)
    }
  }

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/reviews")
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews || [])
      }
    } catch (err) {
      console.error("Failed to load reviews", err)
    } finally {
      setReviewsLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
    const interval = setInterval(fetchReviews, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !text || text.length < 10) {
      toast.error("Please fill in all fields (review must be at least 10 characters).")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          socialHandle: socialHandle.trim() || null,
          rating,
          text
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to submit review")
      }

      toast.success("Thank you! Your testimonial has been submitted for approval.")
      setName("")
      setSocialHandle("")
      setRating(5)
      setText("")
      setShowForm(false)
      fetchReviews() // Refresh list
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="w-full">
      {/* Outermost hero wrapper div */}
      <div className="w-full max-w-full overflow-hidden relative min-h-[100svh] flex flex-col items-center justify-center py-12 space-y-8 sm:space-y-12">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        >
          <source src="/assets/studio-bg.mp4" type="video/mp4" />
        </video>

        {/* Hero Section */}
        <div className="space-y-3 sm:space-y-4 w-full relative z-10">
          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-2 sm:mb-3 tracking-tight text-center px-4 w-full">
            Record Your Vision
            <br />
            <span
              style={{
                background: "linear-gradient(135deg,#C5A880 0%,#A3845B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              At S&amp;G Studio
            </span>
          </h1>
          {/* Subtitle */}
          <p className="text-white/55 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed font-light text-center px-4 w-full">
            Professional-grade recording studio — experienced engineers,
            acoustic precision, and seamless online booking.
          </p>
        </div>

        {/* Three CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md px-4 relative z-10">
          {/* Location */}
          <a
            href="https://maps.app.goo.gl/PehA8b9KfeJqPznF6"
            target="_blank"
            rel="noopener noreferrer"
            id="btn-location"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 text-white/80 hover:text-white px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium backdrop-blur-sm bg-white/5 mx-auto"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Location
          </a>

          {/* Book a Session — primary */}
          <Link
            href="/booking"
            id="btn-book"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-black bg-studio-gold hover:bg-studio-gold/90 transition-all duration-200 mx-auto"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Book a Session
          </Link>

          {/* See Our Services */}
          <Link
            href="/services"
            id="btn-services"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 text-white/80 hover:text-white px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium backdrop-blur-sm bg-white/5 mx-auto"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Our Services
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 sm:space-y-12">
        <PromoFlyer />

      {/* ── Testimonials Section ── */}
      <div className="w-full border-t border-white/10 pt-12 text-left space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Testimonials</h2>
            <p className="text-xs text-white/45 mt-0.5">Hear from the artists, songwriters, and producers who create at S&amp;G</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-white/5 border border-white/15 hover:border-white/30 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
          >
            {showForm ? "Close Form" : "Share Your Story"}
          </button>
        </div>

        {/* Submission Form Modal / Box */}
        {showForm && (
          <div className="bg-black/50 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-md max-w-lg mx-auto">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Leave a Testimonial</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] text-white/50 uppercase tracking-widest font-bold">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-white/50 uppercase tracking-widest font-bold">Social Handle (Optional)</label>
                  <input
                    type="text"
                    value={socialHandle}
                    onChange={(e) => setSocialHandle(e.target.value)}
                    placeholder="e.g. @john_music"
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>

              {/* Star selector */}
              <div className="space-y-1">
                <label className="block text-[10px] text-white/50 uppercase tracking-widest font-bold">Rating</label>
                <div className="flex gap-2.5 items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-lg transition-transform hover:scale-110"
                    >
                      {star <= rating ? "★" : "☆"}
                    </button>
                  ))}
                  <span className="text-[10px] text-white/40 ml-1 font-semibold">{rating} of 5 Stars</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-white/50 uppercase tracking-widest font-bold">Your Testimonial</label>
                <textarea
                  required
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Describe your session experience, quality of service, and sound engineering..."
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl text-xs font-semibold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-studio-gold text-black hover:bg-studio-gold/90 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Post Review"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews Carousel */}
        {reviewsLoading ? (
          <div className="max-w-xl mx-auto h-36 bg-white/5 rounded-2xl animate-pulse" />
        ) : reviews.length > 0 ? (
          <div className="relative max-w-xl mx-auto group">
            {/* Scroll Container */}
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4 scrollbar-none pb-4"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {reviews.map((rev, idx) => {
                const isActive = activeIndex === idx
                return (
                  <div
                    key={rev.id}
                    className={`w-full flex-shrink-0 snap-center transition-all duration-500 ease-out transform ${
                      isActive ? "opacity-100 scale-100" : "opacity-30 scale-95 pointer-events-none"
                    }`}
                  >
                    <div
                      className="bg-black/35 border border-white/10 p-6 md:p-8 rounded-2xl backdrop-blur-sm space-y-4 shadow-xl flex flex-col justify-between min-h-[160px]"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-white">{rev.name}</h4>
                            {rev.socialHandle && (
                              <span className="text-xs text-white/40 block mt-0.5">{rev.socialHandle}</span>
                            )}
                          </div>
                          <div className="text-sm text-[#C5A880]">
                            {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                          </div>
                        </div>
                        <p className="text-sm text-white/80 italic leading-relaxed font-light">
                          &ldquo;{rev.text}&rdquo;
                        </p>
                      </div>
                      <div className="text-[10px] text-white/20 text-right font-medium font-mono">
                        {new Date(rev.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dot Navigation */}
            {reviews.length > 1 && (
              <div className="flex justify-center gap-2 mt-2">
                {reviews.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      activeIndex === idx ? "bg-[#C5A880] w-4" : "bg-white/20 hover:bg-white/40"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 bg-white/[0.01] border border-white/5 rounded-2xl">
            <p className="text-xs text-white/30 italic">No testimonials recorded yet. Be the first to share your experience!</p>
          </div>
        )}
      </div>
      </div>
    </main>
  )
}

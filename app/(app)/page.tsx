"use client"
// app/(app)/page.tsx

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"

interface Review {
  id: string
  name: string
  socialHandle: string | null
  rating: number
  text: string
  createdAt: string
}

export default function HomePage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  // Review Form States
  const [name, setName] = useState("")
  const [socialHandle, setSocialHandle] = useState("")
  const [rating, setRating] = useState(5)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

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
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center max-w-4xl mx-auto space-y-12">

      {/* Hero Section */}
      <div className="space-y-4">
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-3 tracking-tight">
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
        <p className="text-white/55 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-light">
          Professional-grade recording studio — experienced engineers,
          acoustic precision, and seamless online booking.
        </p>
      </div>

      {/* Three CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md">
        {/* Location */}
        <a
          href="https://maps.app.goo.gl/PehA8b9KfeJqPznF6"
          target="_blank"
          rel="noopener noreferrer"
          id="btn-location"
          className="flex-1 inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 text-white/80 hover:text-white px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium backdrop-blur-sm bg-white/5"
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
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-black bg-studio-gold hover:bg-studio-gold/90 transition-all duration-200"
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
          className="flex-1 inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 text-white/80 hover:text-white px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium backdrop-blur-sm bg-white/5"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          Our Services
        </Link>
      </div>

      {/* ── Single unified compact info card ── */}
      <div
        className="w-full max-w-md rounded-2xl px-5 py-4 text-left mx-auto"
        style={{
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        {/* Badge — centered within the card */}
        <div className="flex justify-center mb-3">
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-studio-gold/10 text-studio-gold border border-studio-gold/25"
          >
            WE OFFER
          </span>
        </div>

        {/* Services list */}
        <p className="text-white/65 text-sm leading-relaxed mb-3 text-center">
          Music Productions · Mixing · Sound Engineering
          <br />
          Arrangements · Demo Recording · Jingles
        </p>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-white/40 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            From GHS 300 / session
          </span>
          <span className="text-white/40 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            24 Hours Active
          </span>
          <span className="text-white/40 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Min. 2h 30m
          </span>
          <span className="text-white/40 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Accra, Ghana
          </span>
        </div>
      </div>

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

        {/* Reviews Grid */}
        {reviewsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-28 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-28 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-28 bg-white/5 rounded-xl animate-pulse" />
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.slice(0, 6).map((rev) => (
              <div key={rev.id} className="bg-black/35 border border-white/10 p-5 rounded-2xl backdrop-blur-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white">{rev.name}</h4>
                      {rev.socialHandle && (
                        <span className="text-[10px] text-white/40 block">{rev.socialHandle}</span>
                      )}
                    </div>
                    <div className="text-xs text-white/60">
                      {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                    </div>
                  </div>
                  <p className="text-xs text-white/70 italic leading-relaxed">"{rev.text}"</p>
                </div>
                <div className="text-[9px] text-white/25 text-right font-medium">
                  {new Date(rev.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white/[0.01] border border-white/5 rounded-2xl">
            <p className="text-xs text-white/30 italic">No testimonials recorded yet. Be the first to share your experience!</p>
          </div>
        )}
      </div>

    </main>
  )
}

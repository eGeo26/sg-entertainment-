"use client"
// app/(admin)/admin/reviews/page.tsx

import { useState, useEffect } from "react"
import { toast } from "sonner"

interface Review {
  id: string
  createdAt: string
  name: string
  socialHandle: string | null
  rating: number
  text: string
  approved: boolean
}

export default function ReviewsConsolePage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  // Modal / Form
  const [showFormModal, setShowFormModal] = useState(false)
  const [editReview, setEditReview] = useState<Review | null>(null)
  
  const [reviewForm, setReviewForm] = useState({
    name: "",
    socialHandle: "",
    rating: 5,
    text: "",
    approved: true
  })

  // Password Gate Action protection
  const [showPasswordGate, setShowPasswordGate] = useState(false)
  const [passwordGateAction, setPasswordGateAction] = useState<() => void>(() => {})
  const [gatePasswordInput, setGatePasswordInput] = useState("")

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/admin/reviews")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch {
      toast.error("Failed to load reviews.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const triggerGate = (action: () => void) => {
    setGatePasswordInput("")
    setPasswordGateAction(() => action)
    setShowPasswordGate(true)
  }

  const handlePasswordGateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const realPassword = localStorage.getItem("slay_admin_password") || "admin"
    if (gatePasswordInput === realPassword) {
      setShowPasswordGate(false)
      passwordGateAction()
    } else {
      toast.error("Invalid verification password!")
    }
  }

  const handleOpenAddModal = () => {
    setEditReview(null)
    setReviewForm({
      name: "",
      socialHandle: "",
      rating: 5,
      text: "",
      approved: true
    })
    setShowFormModal(true)
  }

  const handleOpenEditModal = (r: Review) => {
    setEditReview(r)
    setReviewForm({
      name: r.name,
      socialHandle: r.socialHandle || "",
      rating: r.rating,
      text: r.text,
      approved: r.approved
    })
    setShowFormModal(true)
  }

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewForm.name || !reviewForm.text) {
      toast.error("Please fill in all required fields.")
      return
    }

    try {
      const url = editReview ? `/api/admin/reviews/${editReview.id}` : "/api/admin/reviews"
      const method = editReview ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm)
      })

      if (!res.ok) throw new Error()
      toast.success(editReview ? "Review updated" : "Review added successfully")
      setShowFormModal(false)
      fetchReviews()
    } catch {
      toast.error("Failed to save review testimonial.")
    }
  }

  const handleToggleApprove = async (id: string, currentApproved: boolean) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !currentApproved })
      })
      if (!res.ok) throw new Error()
      toast.success(currentApproved ? "Review unapproved" : "Review approved")
      fetchReviews()
    } catch {
      toast.error("Failed to update review approval status.")
    }
  }

  const handleDeleteReview = (id: string) => {
    triggerGate(async () => {
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error()
        toast.success("Review permanently deleted.")
        fetchReviews()
      } catch {
        toast.error("Failed to delete review.")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white uppercase">Reviews Console</h1>
          <p className="text-xs text-white/40 mt-0.5">Moderate customer testimonials and social proof ratings</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center font-bold px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs uppercase tracking-wider gap-2 self-start sm:self-auto transition-all"
        >
          Create Testimonial
        </button>
      </div>

      {/* Grid of reviews */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white/5 h-36 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-white/90 text-sm flex items-center gap-2">
                      {r.name}
                      {r.approved ? (
                        <span className="text-[9px] bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded-full font-semibold">
                          Approved
                        </span>
                      ) : (
                        <span className="text-[9px] bg-white/5 text-white/40 border border-white/10 px-2 py-0.5 rounded-full font-semibold">
                          Pending
                        </span>
                      )}
                    </h3>
                    {r.socialHandle && (
                      <span className="text-[10px] text-white/60 font-medium block mt-0.5">{r.socialHandle}</span>
                    )}
                  </div>
                  {/* Stars */}
                  <div className="flex text-white text-xs">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </div>
                </div>
                <p className="text-white/60 text-xs leading-relaxed italic">
                  &ldquo;{r.text}&rdquo;
                </p>
              </div>

              <div className="flex justify-between items-center border-t border-white/5 pt-3">
                <span className="text-[9px] text-white/20 uppercase tracking-wider font-semibold">
                  Added {new Date(r.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleApprove(r.id, r.approved)}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/70 border border-white/5 rounded-md text-[10px] font-semibold"
                  >
                    {r.approved ? "Unapprove" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(r)}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/70 border border-white/5 rounded-md text-[10px] font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteReview(r.id)}
                    className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-md text-[10px] font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-white/30 text-xs bg-white/[0.01] rounded-xl border border-white/5">
          No customer reviews moderated yet. Tap Create to add one.
        </div>
      )}

      {/* Review Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0F0F0F]/90 border border-white/10 backdrop-blur-2xl rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
                {editReview ? "Edit Testimonial" : "Create Testimonial"}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleSaveReview}>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] text-white/50 uppercase tracking-wide">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Ama Serwaa"
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-white/50 uppercase tracking-wide">Social Handle (@username)</label>
                  <input
                    type="text"
                    value={reviewForm.socialHandle || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, socialHandle: e.target.value }))}
                    placeholder="e.g. @amaserwaa"
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-white/50 uppercase tracking-wide">Rating (1 to 5 Stars)</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-white/50"
                  >
                    <option value={5}>★★★★★ (5 Stars)</option>
                    <option value={4}>★★★★☆ (4 Stars)</option>
                    <option value={3}>★★★☆☆ (3 Stars)</option>
                    <option value={2}>★★☆☆☆ (2 Stars)</option>
                    <option value={1}>★☆☆☆☆ (1 Star)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-white/50 uppercase tracking-wide">Review Text *</label>
                  <textarea
                    required
                    value={reviewForm.text}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder="Write the customer's testimonial review here..."
                    rows={4}
                    minLength={10}
                    maxLength={1000}
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/50 resize-none"
                  />
                </div>

                {/* Approved checkbox */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="form-approved"
                    checked={reviewForm.approved}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, approved: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="form-approved" className="text-xs text-white/70 select-none">
                    Approved (Visible on public homepage)
                  </label>
                </div>
              </div>

              <div className="p-5 border-t border-white/8 flex justify-end gap-3 bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-white/5 border border-white/8 text-white/70 hover:text-white text-xs font-semibold rounded-xl uppercase tracking-wider"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-xl bg-white hover:bg-neutral-200 text-black text-xs uppercase tracking-wider"
                >
                  Save Testimonial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Gate Verification Modal */}
      {showPasswordGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Secondary Password Gate</h3>
            <p className="text-xs text-white/45 mb-4 leading-relaxed">
              This is a critical operation (deleting testimonials). Please enter the admin password to verify.
            </p>
            <form onSubmit={handlePasswordGateSubmit} className="space-y-4">
              <input
                type="password"
                required
                value={gatePasswordInput}
                onChange={(e) => setGatePasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-white/50"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordGate(false)}
                  className="px-4 py-2 bg-white/5 text-white/70 hover:text-white text-xs font-semibold rounded-xl uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider"
                >
                  Verify Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

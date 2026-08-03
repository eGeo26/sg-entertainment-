"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import PasswordField from "../components/PasswordField"

export default function ProducerSettingsPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/producer/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const result = await response.json()

      if (response.status === 401) {
        router.replace("/beatsbylouder")
        return
      }
      if (!response.ok) throw new Error(result.error || "Failed to change password")

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#09090f] text-[#F0EFE8] px-4 py-8 sm:px-6 md:py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-[var(--sg-gold)]">
              Producer Portal · Account
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#F0EFE8]">
              Password settings
            </h1>
            <p className="mt-2 text-sm text-white/45">Update the password used to access Beats By Louder.</p>
          </div>
          <Link
            href="/beatsbylouder"
            className="shrink-0 px-3.5 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-white/65 hover:text-white transition-colors"
          >
            Back to sessions
          </Link>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordField
              id="producer-current-password"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter current password"
              autoFocus
              autoComplete="current-password"
            />
            <PasswordField
              id="producer-new-password"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <PasswordField
              id="producer-confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Enter the new password again"
              autoComplete="new-password"
            />

            <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Link
                href="/beatsbylouder"
                className="px-4 py-3 rounded-xl border border-white/10 text-center text-xs uppercase tracking-wider font-semibold text-white/55 hover:bg-white/5 hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-5 py-3 rounded-xl text-xs uppercase tracking-wider font-bold disabled:opacity-50"
              >
                {submitting ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </section>

        <p className="text-center text-[10px] uppercase tracking-[0.18em] text-white/25">
          Authorized producer access only
        </p>
      </div>
    </main>
  )
}

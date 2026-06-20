"use client"
// app/(admin)/admin/settings/page.tsx

import { useState, useEffect } from "react"
import { toast } from "sonner"

export default function SettingsConsolePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adminPassword, setAdminPassword] = useState("admin")

  // Password fields
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Password Gate Action protection
  const [showPasswordGate, setShowPasswordGate] = useState(false)
  const [passwordGateAction, setPasswordGateAction] = useState<() => void>(() => {})
  const [gatePasswordInput, setGatePasswordInput] = useState("")

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAdminPassword(data.admin_password || "admin")
    } catch {
      toast.error("Failed to load settings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
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

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("Passwords do not match!")
      return
    }
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters long.")
      return
    }

    triggerGate(async () => {
      setSaving(true)
      try {
        const res = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_SETTINGS",
            settings: {
              admin_password: newPassword
            }
          })
        })

        if (!res.ok) throw new Error()
        setAdminPassword(newPassword)
        localStorage.setItem("slay_admin_password", newPassword)
        toast.success("Administrator password updated successfully.")
        setNewPassword("")
        setConfirmPassword("")
      } catch {
        toast.error("Failed to update password.")
      } finally {
        setSaving(false)
      }
    })
  }

  const handleWipeDatabase = () => {
    triggerGate(async () => {
      toast.loading("Purging database records...", { id: "wipe-toast" })
      try {
        const res = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "WIPE_DATABASE" })
        })
        if (!res.ok) throw new Error()
        toast.success("All data entries wiped successfully.", { id: "wipe-toast" })
        fetchSettings()
      } catch {
        toast.error("Wipe operation failed.", { id: "wipe-toast" })
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 max-w-xl mx-auto">
        <div className="h-8 bg-white/10 rounded w-1/4 mb-4" />
        <div className="h-44 bg-white/5 rounded-xl mb-4" />
        <div className="h-44 bg-white/5 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white uppercase">System Configurations</h1>
        <p className="text-xs text-white/40 mt-0.5">Control security credentials and clear local data entries</p>
      </div>

      <div className="space-y-6">
        {/* Credential update */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Change Administrator Password</h3>
          <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] text-white/40 uppercase tracking-widest font-bold">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-white/40 uppercase tracking-widest font-bold">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/50"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-white hover:bg-neutral-200 text-black font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all sm:col-span-2 disabled:opacity-50"
            >
              {saving ? "Updating..." : "Verify & Change Password"}
            </button>
          </form>
        </div>

        {/* Database resets */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5 space-y-3.5">
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider border-b border-red-500/10 pb-2">Destructive Zone</h3>
          <p className="text-[10px] text-red-200/50 leading-relaxed">
            Wipes all listings (bookings and customer reviews testimonials). Wiped data is permanent.
          </p>
          <button
            onClick={handleWipeDatabase}
            className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            Reset / Wipe All Storage
          </button>
        </div>
      </div>

      {/* Password Gate Verification Modal */}
      {showPasswordGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Secondary Password Gate</h3>
            <p className="text-xs text-white/45 mb-4 leading-relaxed">
              This is a critical operation (credential updates or database wipe). Please enter the admin password to verify.
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

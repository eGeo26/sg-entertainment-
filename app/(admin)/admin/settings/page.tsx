"use client"
// app/(admin)/admin/settings/page.tsx

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import PasswordInput from "@/app/(admin)/admin/components/PasswordInput"

export default function SettingsConsolePage() {
  const [loading, setLoading] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const handleWipeDatabase = async () => {
    if (!confirmWipe) {
      setConfirmWipe(true)
      return
    }

    setConfirmWipe(false)
    toast.loading("Purging database records...", { id: "wipe-toast" })
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "WIPE_DATABASE" }),
      })
      if (!res.ok) throw new Error()
      toast.success("All data entries wiped successfully.", { id: "wipe-toast" })
    } catch {
      toast.error("Wipe operation failed.", { id: "wipe-toast" })
    }
  }


  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    setChangingPassword(true)
    try {
      const supabase = createBrowserSupabaseClient()
      
      // First verify current password by attempting to sign in
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user?.email) {
        throw new Error("Could not verify user session")
      }

      // Verify current password by attempting to re-authenticate
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordError("Current password is incorrect")
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Success
      setPasswordSuccess("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordForm(false)
      toast.success("Password changed successfully")
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-light tracking-[0.2em] text-white uppercase">Admin Settings</h1>
        <p className="text-xs text-white/40 mt-1.5">Studio details and system management</p>
      </div>

      <div className="space-y-6">
        {/* Studio Information */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Studio Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block text-white/45 mb-1 uppercase tracking-wider text-[9px] font-bold">Studio Name</span>
              <span className="text-white/80 font-medium">S&amp;G Studios</span>
            </div>
            <div>
              <span className="block text-white/45 mb-1 uppercase tracking-wider text-[9px] font-bold">Location</span>
              <span className="text-white/80 font-medium">Accra, Taifa, Ghana</span>
            </div>
            <div>
              <span className="block text-white/45 mb-1 uppercase tracking-wider text-[9px] font-bold">Phone Number</span>
              <span className="text-white/80 font-medium">0244 922 500</span>
            </div>
            <div>
              <span className="block text-white/45 mb-1 uppercase tracking-wider text-[9px] font-bold">Email Address</span>
              <span className="text-white/80 font-medium">sgentstudios@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Authentication Info */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Authentication</h3>
          
          {!showPasswordForm ? (
            <div className="space-y-3">
              <p className="text-[10px] text-white/40 leading-relaxed">
                Manage your admin account security settings.
              </p>
              <button
                onClick={() => setShowPasswordForm(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/8 text-white/70 hover:text-white text-xs font-semibold rounded-xl uppercase tracking-wider transition-all"
              >
                Change Password
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/45 mb-1.5 font-bold">
                    Current Password
                  </label>
                  <PasswordInput
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    placeholder="Enter current password"
                    disabled={changingPassword}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/45 mb-1.5 font-bold">
                    New Password
                  </label>
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Enter new password (min 6 characters)"
                    disabled={changingPassword}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/45 mb-1.5 font-bold">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm new password"
                    disabled={changingPassword}
                  />
                </div>
              </div>

              {passwordError && (
                <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  {passwordSuccess}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setCurrentPassword("")
                    setNewPassword("")
                    setConfirmPassword("")
                    setPasswordError("")
                    setPasswordSuccess("")
                  }}
                  disabled={changingPassword}
                  className="flex-1 py-2.5 bg-white/5 text-white/60 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Destructive Zone */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5 space-y-3.5">
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider border-b border-red-500/10 pb-2">Destructive Zone</h3>
          <p className="text-[10px] text-red-200/50 leading-relaxed">
            Wipes all bookings and customer reviews. This action is permanent and cannot be undone.
          </p>
          {confirmWipe ? (
            <div className="space-y-2">
              <p className="text-[10px] text-red-300 font-semibold">
                Are you sure? Click again to confirm. This will permanently delete all records.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleWipeDatabase}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white border border-red-500 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Yes, Wipe All Data
                </button>
                <button
                  onClick={() => setConfirmWipe(false)}
                  className="flex-1 py-2.5 bg-white/5 text-white/60 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleWipeDatabase}
              className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Reset / Wipe All Storage
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

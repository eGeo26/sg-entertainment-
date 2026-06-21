"use client"
// app/(admin)/admin/login/page.tsx

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      toast.error("Please enter the password")
      return
    }

    setLoading(true)
    try {
      const result = await signIn("credentials", {
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Invalid admin password")
      } else {
        localStorage.setItem("slay_admin_session", Date.now().toString())
        localStorage.setItem("slay_admin_password", password)
        toast.success("Successfully logged in!")
        router.push("/admin")
        router.refresh()
      }
    } catch (err) {
      console.error("[Login Error]:", err)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070708] relative overflow-hidden px-4">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neutral-900 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Main Login Card - Sleek dark glass card */}
      <div className="w-full max-w-md bg-[#0F0F0F]/90 border border-white/10 backdrop-blur-2xl rounded-2xl p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10 text-white">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-xl font-light tracking-[0.2em] text-white uppercase">S&amp;G Studios</h1>
          <p className="text-[10px] text-white/40 mt-1.5 uppercase tracking-widest font-semibold">Admin Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] text-white/50 mb-2 font-medium uppercase tracking-wider">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center font-bold px-5 py-3.5 rounded-xl transition-all duration-200 hover:bg-neutral-200 bg-white text-black text-sm relative overflow-hidden group"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </span>
            ) : (
              "Sign In to Dashboard"
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-white/30 tracking-wider uppercase">
            Secure Session · Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Enter password",
  disabled = false,
  className = "",
  id,
  name,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        id={id}
        name={name}
        className={`w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-white/20 transition-colors ${className}`}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        disabled={disabled}
        aria-label={showPassword ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {showPassword ? (
          // Eye slash icon (hide)
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223a10.477 10.477 0 001.564 3.94m0 0a10.477 10.477 0 003.94 1.564m0 0a10.477 10.477 0 013.94-1.564m0 0a10.477 10.477 0 001.564-3.94m0 0a10.477 10.477 0 00-1.564-3.94m0 0a10.477 10.477 0 00-3.94-1.564m0 0a10.477 10.477 0 00-3.94 1.564m3.94-1.564V4.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ) : (
          // Eye icon (show)
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>
  )
}

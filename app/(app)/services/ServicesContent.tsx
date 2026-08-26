// app/(app)/services/page.tsx — Services page with In-Studio & Remote tabs
"use client"

import { useState } from "react"
import Link from "next/link"

const IN_HOUSE_SERVICES = [
  {
    title: "Music Recording",
    desc: "Professional vocal and multi-track recording in our acoustically treated booth.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    title: "Full Stem Mix & Mastering",
    desc: "Complete multi-track mix and master from individual stems for maximal clarity, punch, and dynamic balance.",
    packageParam: "Full Stem Mix & Mastering",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    title: "Waves Mix & Mastering",
    desc: "High-definition WAV file mix and mastering treatment ready for commercial distribution.",
    packageParam: "Waves Mix & Mastering",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    title: "MP3 Mix & Mastering",
    desc: "Clean, radio-ready mix and master output optimized for digital streaming and demo playback.",
    packageParam: "MP3 Mix & Mastering",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    title: "Jingles & Ads",
    desc: "Commercial jingles and branded audio produced to broadcast standards.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    title: "Full Production",
    desc: "Custom beat production, arrangement, vocal tuning, and complete sound design tailored to your vision.",
    packageParam: "Full Production",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
]

const REMOTE_PACKAGES = [
  {
    name: "Full Stem Mix & Mastering",
    price: "GHS 2,000",
    desc: "Complete multi-track mix and master from individual stems for maximal clarity, punch, and dynamic balance.",
  },
  {
    name: "Waves Mix & Mastering",
    price: "GHS 1,000",
    desc: "High-definition WAV file mix and mastering treatment ready for commercial distribution.",
  },
  {
    name: "MP3 Mix & Mastering",
    price: "GHS 700",
    desc: "Clean, radio-ready mix and master output optimized for digital streaming and demo playback.",
  },
  {
    name: "Full Production",
    price: "GHS 5,000",
    desc: "End-to-end beat composition, arrangement, vocal tuning, mixing, and mastering from concept to final release.",
  },
]

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState<"in-house" | "remote">("in-house")

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">

      {/* ── Page Header ── */}
      <div className="text-center space-y-3">
        <div className="inline-flex flex-col items-center">
          <span className="text-studio-gold text-xs font-bold uppercase tracking-widest">
            S&amp;G Services
          </span>
          <div className="w-8 h-[2px] bg-studio-gold mt-1" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          Choose Your Production Path
        </h1>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex justify-center">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab("in-house")}
            className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "in-house"
                ? "bg-[#C5A880] text-black shadow-md shadow-black/10"
                : "text-white/50 hover:text-white"
            }`}
          >
            In-Studio
          </button>
          <button
            onClick={() => setActiveTab("remote")}
            className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "remote"
                ? "bg-[#C5A880] text-black shadow-md shadow-black/10"
                : "text-white/50 hover:text-white"
            }`}
          >
            Remote
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          IN-STUDIO TAB
      ══════════════════════════════════════════ */}
      {activeTab === "in-house" && (
        <div className="space-y-8">

          {/* Combined intro callout — gold left-border accent */}
          <div className="border-l-4 border-[#C5A880] pl-5 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-2">
              In-Studio Recording &amp; Engineering
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              S&amp;G Studios is a premier recording destination, built for artists, by artists.
              Our acoustically engineered space and professional-grade equipment deliver the clarity,
              warmth, and presence your music deserves. Book your session below and secure your
              studio time online for GHS 300. Want mixing, mastering, or full production too? Just
              flag it when you book, we&apos;ll sort the details and pricing with you in person,
              producer to artist, the day you walk in.
            </p>
          </div>

          {/* Service Cards — full-width stacked rows */}
          <div className="space-y-3 max-w-3xl mx-auto">
            {IN_HOUSE_SERVICES.map((s) => (
              <Link
                key={s.title}
                href={`/booking?service=${encodeURIComponent(s.title)}${s.packageParam ? `&package=${encodeURIComponent(s.packageParam)}` : ''}`}
                className="flex items-center gap-5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4 hover:border-[#C5A880] transition-all duration-200 group"
              >
                {/* Icon */}
                <div className="shrink-0 text-[#C5A880] group-hover:scale-110 transition-transform duration-200">
                  {s.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm mb-0.5">{s.title}</p>
                  <p className="text-white/50 text-xs leading-relaxed">{s.desc}</p>
                </div>

                {/* Arrow */}
                <div className="shrink-0 text-[#C5A880] group-hover:translate-x-1 transition-transform duration-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          {/* Studio video — always visible */}
          <section className="max-w-3xl mx-auto space-y-3">
            <h3 className="text-xl font-bold text-white text-center">See Our Studio</h3>
            <p className="text-white/45 text-sm text-center">
              Inside S&amp;G Studios, where music comes to life.
            </p>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <video
                controls
                preload="auto"
                playsInline
                className="w-full aspect-video object-cover"
              >
                <source src="/assets/studio-bg.mp4#t=0.5" type="video/mp4" />
              </video>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════
          REMOTE TAB
      ══════════════════════════════════════════ */}
      {activeTab === "remote" && (
        <div className="space-y-8">

          {/* Intro paragraph */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              Can&apos;t make it into the studio? No problem, bring the studio to you. Reach out
              to our producer directly on email or WhatsApp, walk through your project and pick
              your package, then send your tracks over whenever you&apos;re ready. From there, we
              handle the rest and get your sound where it needs to be.
            </p>
          </div>

          {/* Remote Packages */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {REMOTE_PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-white/25 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-white">{pkg.name}</h3>
                    <span className="text-sm font-extrabold text-[#C5A880] shrink-0 bg-[#C5A880]/10 border border-[#C5A880]/20 px-3 py-1 rounded-lg">
                      {pkg.price}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">{pkg.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Block — two equal-weight tiles */}
          <section className="bg-black/50 backdrop-blur-md border border-[#C5A880]/30 rounded-2xl p-6 max-w-4xl mx-auto space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Ready to start your remote project?</h3>
              <p className="text-white/60 text-xs mt-1 max-w-lg mx-auto">
                Get in direct contact with our team to discuss stems, references, and delivery timelines.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Email tile */}
              <a
                href="mailto:Louudarbeats@gmail.com"
                className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl bg-white/5 border border-white/15 hover:border-[#C5A880]/50 transition-all text-center"
              >
                <span className="text-[#C5A880] text-xs font-bold uppercase tracking-wider">Email the producer</span>
                <span className="text-white text-sm font-semibold break-all">Louudarbeats@gmail.com</span>
              </a>

              {/* Phone tile */}
              <a
                href="tel:0244922500"
                className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl bg-white/5 border border-white/15 hover:border-[#C5A880]/50 transition-all text-center"
              >
                <span className="text-[#C5A880] text-xs font-bold uppercase tracking-wider">Call the studio</span>
                <span className="text-white text-sm font-bold">0244 922 500</span>
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

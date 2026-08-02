// app/(app)/services/page.tsx — Services page with In-Studio & Remote tabs
"use client"

import { useState } from "react"
import Image from "next/image"
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
    title: "Mixing & Mastering",
    desc: "Industry-ready sound from our in-house engineers, with crisp highs and punchy lows.",
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
      {/* Page Header */}
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

      {/* Tab Switcher */}
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

      {/* ── IN-STUDIO TAB ── */}
      {activeTab === "in-house" && (
        <div className="space-y-10">
          {/* Intro Copy */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              Step into the booth and let&apos;s make something great. Book your session below and secure your studio time online. Want mixing, mastering, or full production too? Just flag it when you book, we&apos;ll sort the details and pricing with you in person, producer to artist, the day you walk in.
            </p>
          </div>

          {/* Hero section with logo */}
          <section className="grid md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">
                In-Studio Recording &amp; Engineering
              </h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                S&amp;G Studios is a premier recording destination, built for artists, by artists.
                Our acoustically engineered space and professional-grade equipment deliver the clarity,
                warmth, and presence your music deserves.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/booking" className="btn-primary text-sm py-3 px-6 flex items-center justify-center gap-1.5">
                  Book a Session
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <a href="tel:0244922500"
                  className="btn-secondary text-sm py-3 px-6 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  0244 922 500
                </a>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
              <Image
                src="/assets/sg-logo.png"
                alt="S&G Studios — Professional Recording Studio"
                width={500}
                height={500}
                className="w-full object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-bold">S&amp;G Studios</p>
                <p className="text-white/70 text-xs">Accra, Ghana</p>
              </div>
            </div>
          </section>

          {/* In-Studio Services Entry Point Cards */}
          <section>
            <h3 className="text-xl font-bold text-white mb-4 text-center">In-Studio Entry Points</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {IN_HOUSE_SERVICES.map((s) => (
                <Link
                  key={s.title}
                  href={`/booking?service=${encodeURIComponent(s.title)}`}
                  className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-[#C5A880] transition-all duration-200 group flex flex-col justify-between block"
                >
                  <div>
                    <div className="text-[#C5A880] mb-3 group-hover:scale-105 transition-transform duration-200">
                      {s.icon}
                    </div>
                    <h4 className="text-base font-semibold text-white mb-1.5">{s.title}</h4>
                    <p className="text-white/50 text-xs leading-relaxed mb-4">{s.desc}</p>
                  </div>
                  <div className="text-xs font-bold text-[#C5A880] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Book This Service
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Playable studio video */}
          <section>
            <h3 className="text-xl font-bold text-white mb-2 text-center">See Our Studio</h3>
            <p className="text-white/45 text-sm text-center mb-5">
              Inside S&amp;G Studios, where music comes to life.
            </p>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl max-w-2xl mx-auto">
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

      {/* ── REMOTE TAB ── */}
      {activeTab === "remote" && (
        <div className="space-y-8">
          {/* Intro Copy */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              Can&apos;t make it into the studio? No problem, bring the studio to you. Reach out to our producer directly on email or WhatsApp, walk through your project and pick your package, then send your tracks over whenever you&apos;re ready. From there, we handle the rest and get your sound where it needs to be.
            </p>
          </div>

          {/* Packages List */}
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
                  <p className="text-white/50 text-xs leading-relaxed">
                    {pkg.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Producer Contact Block */}
          <section className="bg-black/50 backdrop-blur-md border border-[#C5A880]/30 rounded-2xl p-6 text-center space-y-4 max-w-4xl mx-auto">
            <h3 className="text-lg font-bold text-white">Ready to start your remote project?</h3>
            <p className="text-white/60 text-xs max-w-lg mx-auto">
              Get in direct contact with our lead producer to discuss stems, references, and delivery timelines.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
              <a
                href="mailto:Louudarbeats@gmail.com"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/15 hover:border-white/40 text-white text-xs font-semibold transition-all w-full sm:w-auto justify-center"
              >
                <span>🎙️ Talk to the producer:</span>
                <span className="text-[#C5A880] underline">Louudarbeats@gmail.com</span>
              </a>
              <a
                href="https://wa.me/233247478196"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 text-xs font-semibold transition-all w-full sm:w-auto justify-center"
              >
                <span>💬 WhatsApp:</span>
                <span>+233 24 747 8196</span>
              </a>
            </div>
            <p className="text-white/35 text-[11px]">
              Message or call, whichever&apos;s easier for you
            </p>
          </section>
        </div>
      )}

      {/* Common Contact Footer Card */}
      <section className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-5 max-w-4xl mx-auto">
        <h3 className="text-base font-bold text-white mb-4 text-center">Get in Touch</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-white/35 text-xs uppercase tracking-wider mb-1">Call for Bookings</p>
            <a href="tel:0244922500" className="text-white text-sm font-semibold hover:text-white transition-colors block">0244 922 500</a>
          </div>
          <div>
            <p className="text-white/35 text-xs uppercase tracking-wider mb-1">Email</p>
            <a href="mailto:sgentstudios@gmail.com" className="text-white text-sm font-semibold hover:text-white transition-colors">
              sgentstudios@gmail.com
            </a>
          </div>
          <div>
            <p className="text-white/35 text-xs uppercase tracking-wider mb-1">Location</p>
            <a
              href="https://maps.app.goo.gl/PehA8b9KfeJqPznF6"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-sm font-semibold hover:text-white transition-colors"
            >
              Accra, Ghana
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

// app/services/page.tsx — Services page (video/nav/footer come from layout)
"use client"

import Image from "next/image"
import Link from "next/link"

const SERVICES = [
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
    desc: "Industry-ready sound from our in-house engineers — crisp highs, punchy lows.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    title: "Sound Engineering",
    desc: "Expert audio across Afrobeats, Gospel, Highlife, Hiplife and more.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Arrangements",
    desc: "Full musical arrangements — harmonies, instrumentation, chord progressions.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    title: "Demo Recording",
    desc: "High-quality demo sessions for artists pitching to labels or streaming platforms.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
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
]

export default function ServicesPage() {
  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-10">

      {/* Hero — logo + headline + bio */}
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <span className="inline-block bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            We Offer
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            Professional<br />
            <span className="text-white">Recording Studio</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            S&amp;G Studios is a premier recording destination — built for artists, by artists.
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

        {/* Logo image panel */}
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

      {/* Services grid — compact */}
      <section>
        <h2 className="text-xl font-bold text-white mb-5 text-center">Our Services</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-white/40 transition-all duration-200 group"
            >
              <div className="text-white/80 mb-2.5 group-hover:scale-105 transition-transform duration-200">
                {s.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{s.title}</h3>
              <p className="text-white/50 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Playable studio video */}
      <section>
        <h2 className="text-xl font-bold text-white mb-2 text-center">See Our Studio</h2>
        <p className="text-white/45 text-sm text-center mb-5">
          Inside S&amp;G Studios — where music comes to life.
        </p>
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl max-w-2xl mx-auto">
          <video
            controls
            className="w-full aspect-video object-cover"
          >
            <source src="/assets/studio-bg.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      {/* Contact compact card */}
      <section className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
        <h2 className="text-base font-bold text-white mb-4 text-center">Get in Touch</h2>
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

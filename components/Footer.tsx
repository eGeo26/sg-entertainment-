// components/Footer.tsx — Universal footer with social media links

export default function Footer() {
  return (
    <footer
      className="relative z-10 border-t py-5 px-4"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Left — Contact */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-white/35 text-xs">
          <span className="hidden sm:inline text-white/20">©2024 S&amp;G Studios · Accra, Ghana</span>
          <a href="tel:0244922500" className="hover:text-white/70 transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
            0244 922 500
          </a>
          <a href="mailto:sgentstudios@gmail.com" className="hover:text-white/70 transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            sgentstudios@gmail.com
          </a>
        </div>

        {/* Right — Social media icons */}
        <div className="flex items-center gap-4">
          {/* Snapchat */}
          <a
            href="https://www.snapchat.com/add/sg_entertai2021"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Snapchat: sg_entertai2021"
            className="text-white/35 hover:text-[#FFFC00] transition-colors"
            title="Snapchat: sg_entertai2021"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.166.8C6.44.8 5.5 5.93 5.5 7.42v.54c-.5.2-1 .1-1.4-.1-.3-.1-.5-.1-.7 0-.5.2-.6.8-.3 1.3.5.8 1.5 1.3 2.7 1.5-.3.9-.8 1.7-1.5 2.2-.6.4-1.3.6-2 .6-.3 0-.7-.1-.9-.1-.3 0-.5.1-.6.3-.1.2-.1.5.1.7 1.1 1.1 3.4 1.2 4.4 1.6.1.4.2 1.2.2 1.6 0 .3-.1.5-.3.7-.2.1-.5.2-.8.2-.6 0-1.4-.3-2.2-.8-.2-.1-.5-.2-.7-.1-.3.1-.4.3-.4.5 0 .6 1.1 1.5 3.2 1.9.2.6.5 1.4 1.2 1.4.4 0 .8-.2 1.4-.5.6-.3 1.3-.7 2.1-.7.8 0 1.5.4 2.1.7.6.3 1 .5 1.4.5.7 0 1-.8 1.2-1.4 2.1-.4 3.2-1.3 3.2-1.9 0-.2-.1-.4-.4-.5-.2-.1-.5 0-.7.1-.8.5-1.6.8-2.2.8-.3 0-.6-.1-.8-.2-.2-.2-.3-.4-.3-.7 0-.4.1-1.2.2-1.6 1-.4 3.3-.5 4.4-1.6.2-.2.2-.5.1-.7-.1-.2-.3-.3-.6-.3-.2 0-.6.1-.9.1-.7 0-1.4-.2-2-.6-.7-.5-1.2-1.3-1.5-2.2 1.2-.2 2.2-.7 2.7-1.5.3-.5.2-1.1-.3-1.3-.2-.1-.4-.1-.7 0-.4.2-.9.3-1.4.1v-.54C18.5 5.93 17.56.8 12.166.8z"/>
            </svg>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/sgentertainmentgh"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram: sgentertainmentgh"
            className="text-white/35 hover:text-[#E1306C] transition-colors"
            title="Instagram: sgentertainmentgh"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Mobile copyright */}
      <p className="text-center text-white/20 text-xs mt-3 sm:hidden">
        © 2024 S&amp;G Studios · Accra, Ghana
      </p>
    </footer>
  )
}

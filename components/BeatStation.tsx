"use client"
// components/BeatStation.tsx
// S&G Beat Station — Secret Easter Egg
// Triggered by: Konami Code (↑↑↓↓←→←→BA) OR clicking the logo 7× fast

import { useEffect, useRef, useState, useCallback } from "react"

interface BeatStationProps {
  onClose: () => void
}

// ── Synth engine helpers ───────────────────────────────────────────────────────

function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)()
}

function playKick(ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(dest)
  osc.frequency.setValueAtTime(160, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
  gain.gain.setValueAtTime(1, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
}

function playSnare(ctx: AudioContext, dest: AudioNode) {
  const bufferSize = ctx.sampleRate * 0.2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"; hp.frequency.value = 1500
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.8, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
  src.connect(hp); hp.connect(gain); gain.connect(dest)
  src.start(ctx.currentTime)
}

function playHihat(ctx: AudioContext, dest: AudioNode) {
  const bufferSize = ctx.sampleRate * 0.05
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"; hp.frequency.value = 8000
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.4, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
  src.connect(hp); hp.connect(gain); gain.connect(dest)
  src.start(ctx.currentTime)
}

function playBass(ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(60, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.6)
  gain.gain.setValueAtTime(1, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
  osc.connect(gain); gain.connect(dest)
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6)
}

function playChime(ctx: AudioContext, dest: AudioNode) {
  const freqs = [523, 659, 784, 1047]
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = f
    const t = ctx.currentTime + i * 0.06
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.5, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    osc.connect(gain); gain.connect(dest)
    osc.start(t); osc.stop(t + 0.5)
  })
}

function playAirhorn(ctx: AudioContext, dest: AudioNode) {
  const oscs = [233, 466, 699].map(f => {
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(f * 0.5, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(f, ctx.currentTime + 0.1)
    return osc
  })
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.4, ctx.currentTime)
  gain.gain.setValueAtTime(0.4, ctx.currentTime + 0.6)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
  oscs.forEach(o => { o.connect(gain) })
  gain.connect(dest)
  oscs.forEach(o => { o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.8) })
}

function playLaser(ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(80, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.4)
  gain.gain.setValueAtTime(0.6, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
  osc.connect(gain); gain.connect(dest)
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
}

function playSGDrop(ctx: AudioContext, dest: AudioNode) {
  // Sub riser + detuned square → "S&G Drop" feel
  const sub = ctx.createOscillator()
  const top = ctx.createOscillator()
  const gain = ctx.createGain()
  sub.type = "sine"; top.type = "square"
  sub.frequency.setValueAtTime(40, ctx.currentTime)
  sub.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.8)
  top.frequency.setValueAtTime(240, ctx.currentTime)
  top.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.8)
  top.detune.value = 25
  gain.gain.setValueAtTime(0.6, ctx.currentTime)
  gain.gain.setValueAtTime(0.6, ctx.currentTime + 0.6)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
  sub.connect(gain); top.connect(gain); gain.connect(dest)
  sub.start(ctx.currentTime); sub.stop(ctx.currentTime + 0.8)
  top.start(ctx.currentTime); top.stop(ctx.currentTime + 0.8)
}

// ── Pad definitions ────────────────────────────────────────────────────────────

const PADS = [
  { id: "kick",   label: "KICK",    emoji: "🥁", color: "#C5A880", fn: playKick,    key: "q" },
  { id: "snare",  label: "SNARE",   emoji: "🎯", color: "#a87fd4", fn: playSnare,   key: "w" },
  { id: "hihat",  label: "HI-HAT",  emoji: "🔔", color: "#7fbbeb", fn: playHihat,   key: "e" },
  { id: "bass",   label: "BASS",    emoji: "🔊", color: "#e8614f", fn: playBass,    key: "r" },
  { id: "chime",  label: "CHIME",   emoji: "🎵", color: "#4fc97d", fn: playChime,   key: "a" },
  { id: "horn",   label: "AIRHORN", emoji: "📯", color: "#f0c419", fn: playAirhorn, key: "s" },
  { id: "laser",  label: "LASER",   emoji: "⚡", color: "#6ef0f0", fn: playLaser,   key: "d" },
  { id: "drop",   label: "S&G DROP",emoji: "💥", color: "#ff6eba", fn: playSGDrop,  key: "f" },
] as const

// ── 16-step sequencer grid defaults ───────────────────────────────────────────
const STEPS = 16
const DEFAULT_BPM = 128

function makeEmptyGrid(): boolean[][] {
  return PADS.map(() => Array(STEPS).fill(false))
}

function makeDefaultBeat(): boolean[][] {
  const g = makeEmptyGrid()
  // Kick on 1, 5, 9, 13
  ;[0, 4, 8, 12].forEach(s => { g[0][s] = true })
  // Snare on 4, 12
  ;[4, 12].forEach(s => { g[1][s] = true })
  // Hihat every 2 steps
  ;[0, 2, 4, 6, 8, 10, 12, 14].forEach(s => { g[2][s] = true })
  // Bass on 0, 8
  ;[0, 8].forEach(s => { g[3][s] = true })
  return g
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BeatStation({ onClose }: BeatStationProps) {
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const sequencerRef = useRef<NodeJS.Timeout | null>(null)
  const currentStepRef = useRef(0)

  const [activePad, setActivePad] = useState<string | null>(null)
  const [grid, setGrid] = useState<boolean[][]>(makeDefaultBeat)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [currentStep, setCurrentStep] = useState(-1)
  const [isClosing, setIsClosing] = useState(false)

  // ── Ensure AudioContext is ready ─────────────────────────────────────────────
  function ensureCtx() {
    if (!ctxRef.current) {
      const ctx = createAudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.connect(ctx.destination)
      ctxRef.current = ctx
      analyserRef.current = analyser
    } else if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume()
    }
    return { ctx: ctxRef.current!, dest: analyserRef.current! }
  }

  // ── Play a pad ───────────────────────────────────────────────────────────────
  const triggerPad = useCallback((padId: string) => {
    const { ctx, dest } = ensureCtx()
    const pad = PADS.find(p => p.id === padId)
    if (!pad) return
    pad.fn(ctx, dest)
    setActivePad(padId)
    setTimeout(() => setActivePad(null), 120)
  }, [])

  // ── Keyboard shortcut handler ────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "Escape") handleClose()
      const pad = PADS.find(p => p.key === e.key.toLowerCase())
      if (pad) triggerPad(pad.id)
    }
    window.addEventListener("keydown", handle)
    return () => window.removeEventListener("keydown", handle)
  }, [triggerPad])

  // ── Oscilloscope canvas loop ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext("2d")!

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      const analyser = analyserRef.current
      if (!analyser) {
        // Draw idle flat line
        ctx2d.clearRect(0, 0, canvas.width, canvas.height)
        ctx2d.beginPath()
        ctx2d.strokeStyle = "rgba(197,168,128,0.3)"
        ctx2d.lineWidth = 1.5
        ctx2d.moveTo(0, canvas.height / 2)
        ctx2d.lineTo(canvas.width, canvas.height / 2)
        ctx2d.stroke()
        return
      }
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyser.getByteTimeDomainData(dataArray)

      ctx2d.clearRect(0, 0, canvas.width, canvas.height)

      // Glowing line
      ctx2d.lineWidth = 2
      ctx2d.strokeStyle = "#C5A880"
      ctx2d.shadowBlur = 8
      ctx2d.shadowColor = "#C5A880"
      ctx2d.beginPath()

      const sliceWidth = canvas.width / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128
        const y = (v * canvas.height) / 2
        if (i === 0) ctx2d.moveTo(x, y)
        else ctx2d.lineTo(x, y)
        x += sliceWidth
      }
      ctx2d.lineTo(canvas.width, canvas.height / 2)
      ctx2d.stroke()
      ctx2d.shadowBlur = 0
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  // ── Sequencer engine ─────────────────────────────────────────────────────────
  const startSequencer = useCallback(() => {
    currentStepRef.current = 0
    const interval = (60 / bpm / 4) * 1000 // 16th note interval

    sequencerRef.current = setInterval(() => {
      const step = currentStepRef.current
      setCurrentStep(step)

      const { ctx, dest } = ensureCtx()
      PADS.forEach((pad, padIndex) => {
        if (grid[padIndex]?.[step]) {
          pad.fn(ctx, dest)
          setActivePad(pad.id)
          setTimeout(() => setActivePad(p => p === pad.id ? null : p), 80)
        }
      })

      currentStepRef.current = (step + 1) % STEPS
    }, interval)
  }, [bpm, grid])

  const stopSequencer = useCallback(() => {
    if (sequencerRef.current) {
      clearInterval(sequencerRef.current)
      sequencerRef.current = null
    }
    setCurrentStep(-1)
  }, [])

  const togglePlay = () => {
    if (isPlaying) {
      stopSequencer()
      setIsPlaying(false)
    } else {
      startSequencer()
      setIsPlaying(true)
    }
  }

  // Restart sequencer when bpm changes while playing
  useEffect(() => {
    if (isPlaying) {
      stopSequencer()
      startSequencer()
    }
  }, [bpm])

  // ── Grid toggle ──────────────────────────────────────────────────────────────
  const toggleStep = (padIdx: number, stepIdx: number) => {
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[padIdx][stepIdx] = !next[padIdx][stepIdx]
      return next
    })
  }

  // ── Close with animation ─────────────────────────────────────────────────────
  const handleClose = () => {
    stopSequencer()
    setIsClosing(true)
    setTimeout(() => {
      ctxRef.current?.close()
      onClose()
    }, 300)
  }

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopSequencer()
      ctxRef.current?.close()
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 transition-all duration-300 ${isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(145deg, rgba(10,10,12,0.97) 0%, rgba(20,16,10,0.97) 100%)",
          border: "1px solid rgba(197,168,128,0.25)",
          boxShadow: "0 0 80px rgba(197,168,128,0.12), 0 0 160px rgba(197,168,128,0.06)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A880]/60">
                🎙️ S&G Studios — Secret Mode
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Beat <span style={{ color: "#C5A880" }}>Station</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* BPM control */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <button
                onClick={() => setBpm(b => Math.max(60, b - 5))}
                className="text-white/50 hover:text-white text-sm font-bold w-5 text-center transition-colors"
              >−</button>
              <span className="text-white text-xs font-mono font-bold w-8 text-center">{bpm}</span>
              <button
                onClick={() => setBpm(b => Math.min(200, b + 5))}
                className="text-white/50 hover:text-white text-sm font-bold w-5 text-center transition-colors"
              >+</button>
              <span className="text-white/30 text-[9px] uppercase tracking-widest">BPM</span>
            </div>
            {/* Close */}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Oscilloscope ── */}
        <div className="px-6 pb-3">
          <canvas
            ref={canvasRef}
            width={640}
            height={48}
            className="w-full rounded-xl"
            style={{ background: "rgba(197,168,128,0.03)", border: "1px solid rgba(197,168,128,0.10)" }}
          />
        </div>

        {/* ── Pads ── */}
        <div className="px-6 pb-4 grid grid-cols-4 gap-2.5">
          {PADS.map((pad) => {
            const isActive = activePad === pad.id
            return (
              <button
                key={pad.id}
                onMouseDown={() => triggerPad(pad.id)}
                className="relative flex flex-col items-center justify-center rounded-2xl py-4 select-none transition-all duration-75 active:scale-95"
                style={{
                  background: isActive
                    ? `${pad.color}22`
                    : "rgba(255,255,255,0.04)",
                  border: isActive
                    ? `1.5px solid ${pad.color}`
                    : "1.5px solid rgba(255,255,255,0.08)",
                  boxShadow: isActive
                    ? `0 0 24px ${pad.color}55, inset 0 0 12px ${pad.color}22`
                    : "none",
                  transform: isActive ? "scale(0.95)" : "scale(1)",
                }}
              >
                <span className="text-2xl mb-1 pointer-events-none">{pad.emoji}</span>
                <span
                  className="text-[9px] font-black uppercase tracking-widest pointer-events-none"
                  style={{ color: isActive ? pad.color : "rgba(255,255,255,0.45)" }}
                >
                  {pad.label}
                </span>
                {/* Keyboard hint */}
                <span
                  className="absolute top-1.5 right-2 text-[8px] font-mono font-bold opacity-30"
                  style={{ color: pad.color }}
                >
                  {pad.key.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Sequencer grid ── */}
        <div className="px-6 pb-4">
          <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-2">Step Sequencer</p>
          <div className="space-y-1.5">
            {PADS.map((pad, padIdx) => (
              <div key={pad.id} className="flex items-center gap-1.5">
                <span
                  className="text-[8px] font-black uppercase tracking-wider w-12 shrink-0 text-right"
                  style={{ color: pad.color + "80" }}
                >
                  {pad.label.split(" ")[0]}
                </span>
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: STEPS }).map((_, stepIdx) => {
                    const isOn = grid[padIdx]?.[stepIdx] ?? false
                    const isCurrent = stepIdx === currentStep
                    const isBar = stepIdx % 4 === 0
                    return (
                      <button
                        key={stepIdx}
                        onClick={() => toggleStep(padIdx, stepIdx)}
                        className="flex-1 h-5 rounded-sm transition-all duration-75"
                        style={{
                          background: isCurrent
                            ? "#C5A880"
                            : isOn
                              ? `${pad.color}cc`
                              : isBar
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(255,255,255,0.04)",
                          border: isCurrent
                            ? `1px solid ${pad.color}`
                            : isOn
                              ? `1px solid ${pad.color}55`
                              : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isOn && !isCurrent ? `0 0 6px ${pad.color}44` : "none",
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Transport controls ── */}
        <div className="px-6 pb-6 flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            style={{
              background: isPlaying ? "rgba(197,168,128,0.15)" : "#C5A880",
              color: isPlaying ? "#C5A880" : "#000",
              border: isPlaying ? "1.5px solid #C5A880" : "1.5px solid #C5A880",
              boxShadow: isPlaying ? "0 0 20px rgba(197,168,128,0.3)" : "none",
            }}
          >
            {isPlaying ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                Stop
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
                Play Beat
              </>
            )}
          </button>

          <button
            onClick={() => setGrid(makeDefaultBeat())}
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            Reset
          </button>
          <button
            onClick={() => setGrid(makeEmptyGrid())}
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            Clear
          </button>

          <div className="ml-auto text-[9px] text-white/20 uppercase tracking-widest text-right">
            <p>Keys Q–F to jam</p>
            <p>ESC to close</p>
          </div>
        </div>
      </div>
    </div>
  )
}

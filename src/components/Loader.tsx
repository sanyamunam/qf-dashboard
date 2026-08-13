/**
 * The loader earns the word "AI-powered": analysis shown happening, real numbers,
 * resolving into the answer. 2.4s max, tap to skip, never twice per session.
 * Its last line becomes the L1 header's first line (shared layoutId).
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { BotainaFigure } from './Botaina'
import { inventory, needsYouCount } from '../model/data'

function Counter({ to, run, delay }: { to: number; run: boolean; delay: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0
    const t0 = performance.now() + delay
    const dur = 620
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / dur))
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, to, delay])
  return <span className="num font-bold text-sidra">{n}</span>
}

export const LOADER_LINES = {
  final:
    needsYouCount === 0
      ? 'Nothing needs you today.'
      : `Found ${needsYouCount} that need you today.`,
}

export function Loader({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState(0)
  const comparable = inventory.total - inventory.yearEnd - inventory.idle // 142-ish, computed

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(onDone, 220)
      return () => clearTimeout(t)
    }
    const timers = [
      setTimeout(() => setPhase(1), 450),
      setTimeout(() => setPhase(2), 950),
      setTimeout(() => setPhase(3), 1450),
      setTimeout(onDone, 2400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onDone, reduced])

  const lines = [
    <>
      Reading <Counter to={inventory.total} run={phase >= 1} delay={0} /> indicators across{' '}
      <Counter to={inventory.entities.length} run={phase >= 1} delay={200} /> entities
    </>,
    <>
      Comparing <Counter to={comparable} run={phase >= 2} delay={0} /> against target and pace
    </>,
  ]

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cream"
      onClick={onDone}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } }}
      role="button"
      aria-label="Skip loading"
    >
      <div className="flex items-center gap-10 px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          <BotainaFigure size={150} state="thinking" />
        </motion.div>
        <div className="flex flex-col gap-3.5 text-[17px] text-ink-soft" style={{ minWidth: 300 }}>
          {/* the lamp mark resolving */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-2 flex items-center gap-2.5"
          >
            <LampMark />
            <span className="label text-sidra">Al Mishkat</span>
          </motion.div>
          <AnimatePresence>
            {lines.map((l, i) =>
              phase >= i + 1 ? (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                >
                  {l}
                </motion.div>
              ) : null,
            )}
            {phase >= 3 && (
              <motion.div
                key="final"
                layoutId="standing-lede"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="voice text-[21px] text-sidra"
              >
                {LOADER_LINES.final}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export function LampMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {/* a niche holding a lamp: arch + flame */}
      <path d="M4 21 V10 a8 8 0 0 1 16 0 V21" fill="none" stroke="#034638" strokeWidth="1.8" />
      <path d="M12 14.6 c-1.8-1.5-1.4-3.6 0-5 c1.4 1.4 1.8 3.5 0 5 Z" fill="#e5a823" />
      <line x1="8.5" y1="18" x2="15.5" y2="18" stroke="#034638" strokeWidth="1.8" />
    </svg>
  )
}

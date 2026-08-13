/**
 * BOTaina — QF's analyst character, recreated as inline SVG.
 * (The supplied BOTaina_shadow.gif was not present on disk; this hand-drawn
 * recreation stands in, per the design plan's substitution note.)
 * She belongs to the platform: Sidra green chrome only, never a theme hue.
 */
import { motion } from 'framer-motion'

export type BotainaState = 'idle' | 'resting' | 'thinking' | 'speaking' | 'listening' | 'pointing'

const OPACITY: Record<BotainaState, number> = {
  idle: 0.38,
  resting: 0.55,
  thinking: 0.9,
  speaking: 1,
  listening: 1,
  pointing: 1,
}

export function BotainaFigure({ size = 150, state = 'idle' }: { size?: number; state?: BotainaState }) {
  const breathing = state !== 'resting'
  return (
    <motion.div
      style={{ width: size, height: size * 1.22, position: 'relative' }}
      animate={{
        opacity: OPACITY[state],
        scale: state === 'listening' ? 0.94 : state === 'speaking' ? 1.02 : 1,
      }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
    >
      {state === 'listening' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '-12%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(3,70,56,0.16), transparent 70%)',
          }}
        />
      )}
      <motion.svg
        viewBox="0 0 200 244"
        width="100%"
        height="100%"
        role="img"
        aria-label="BOTaina, the Al Mishkat analyst"
        animate={breathing ? { y: [0, -3, 0] } : { y: 0 }}
        transition={breathing ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        {/* shadow */}
        <ellipse cx="100" cy="232" rx="52" ry="9" fill="rgba(18,40,34,0.12)" />
        {/* body — abaya */}
        <path d="M100 118 C 60 118 44 160 44 200 C 44 224 66 234 100 234 C 134 234 156 224 156 200 C 156 160 140 118 100 118 Z" fill="#17171a" />
        {/* hands */}
        <circle cx="46" cy="196" r="13" fill="#e8c39e" />
        <motion.g
          animate={state === 'pointing' ? { rotate: -28, x: 4, y: -10 } : { rotate: 0, x: 0, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          style={{ originX: '154px', originY: '186px' }}
        >
          <circle cx="154" cy="196" r="13" fill="#e8c39e" />
        </motion.g>
        {/* hijab outer */}
        <circle cx="100" cy="78" r="64" fill="#17171a" />
        <path d="M100 138 C 78 138 62 130 56 116 L 144 116 C 138 130 122 138 100 138 Z" fill="#17171a" />
        {/* face */}
        <circle cx="100" cy="82" r="46" fill="#e8c39e" />
        {/* glasses — her motif */}
        <g stroke="#101014" strokeWidth="7" fill="rgba(255,255,255,0.06)">
          <rect x="52" y="60" width="44" height="42" rx="13" />
          <rect x="104" y="60" width="44" height="42" rx="13" />
          <line x1="96" y1="78" x2="104" y2="78" />
        </g>
        {/* light sweep across the lenses when thinking */}
        {state === 'thinking' && (
          <motion.rect
            x="40"
            y="58"
            width="14"
            height="46"
            fill="rgba(255,255,255,0.5)"
            transform="skewX(-18)"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 150, opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.6 }}
          />
        )}
        {/* eyes — blink */}
        <g fill="#101014">
          <ellipse cx="74" cy="82" rx="7" ry="10">
            <animate attributeName="ry" values="10;10;1;10;10" keyTimes="0;0.44;0.5;0.56;1" dur="4.6s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="126" cy="82" rx="7" ry="10">
            <animate attributeName="ry" values="10;10;1;10;10" keyTimes="0;0.44;0.5;0.56;1" dur="4.6s" repeatCount="indefinite" />
          </ellipse>
        </g>
        {/* brows */}
        <path d="M62 52 Q 74 46 88 51" stroke="#101014" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M112 51 Q 126 46 138 52" stroke="#101014" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* lips */}
        <path d="M88 112 Q 100 120 112 112 Q 100 116 88 112 Z" fill="#9c3b3b" />
      </motion.svg>
    </motion.div>
  )
}

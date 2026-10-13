import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const APPEAR = 700
const HOLD = 700
const REVEAL_HOLD = 1400
const SPLIT = 2000
const EASE = [0.16, 1, 0.3, 1] as const
const REVEAL_EASE = [0.45, 0, 0.15, 1] as const

type Phase = 'wait' | 'nan' | 'full' | 'split' | 'done'

const reveal = (on: boolean) => ({
  maxWidth: on ? '3.6ch' : '0ch'
})

const LETTER = 520
const STAGGER = 90
const LETTER_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function letterStyle(on: boolean, delay: number) {
  return {
    transitionProperty: 'opacity, transform, filter',
    transitionDuration: `${LETTER}ms`,
    transitionDelay: on ? `${delay}ms` : '0ms',
    transitionTimingFunction: LETTER_EASE,
    opacity: on ? 1 : 0,
    transform: on ? 'translateY(0) scale(1)' : 'translateY(0.3em) scale(0.86)',
    filter: on ? 'blur(0px)' : 'blur(9px)'
  }
}

export function Splash({ ready }: { ready: boolean }) {
  const [phase, setPhase] = useState<Phase>('wait')

  useEffect(() => {
    if (!ready) return
    setPhase('nan')
    const toFull = setTimeout(() => setPhase('full'), APPEAR + HOLD)
    const toSplit = setTimeout(() => setPhase('split'), APPEAR + HOLD + REVEAL_HOLD)
    const toDone = setTimeout(() => setPhase('done'), APPEAR + HOLD + REVEAL_HOLD + SPLIT)
    return () => {
      clearTimeout(toFull)
      clearTimeout(toSplit)
      clearTimeout(toDone)
    }
  }, [ready])

  if (phase === 'done') return null

  const visible = phase !== 'wait'
  const shown = phase === 'full' || phase === 'split'
  const splitting = phase === 'split'

  return (
    <div className={`fixed inset-0 z-[200] overflow-hidden ${splitting ? 'pointer-events-none' : ''}`}>
      <div className="absolute inset-0 flex">
        <motion.div
          className="h-full w-1/2 bg-background transition-colors duration-500"
          initial={false}
          animate={{ x: splitting ? '-100%' : '0%' }}
          transition={{ duration: SPLIT / 1000, ease: EASE }}
        />
        <motion.div
          className="h-full w-1/2 bg-background transition-colors duration-500"
          initial={false}
          animate={{ x: splitting ? '100%' : '0%' }}
          transition={{ duration: SPLIT / 1000, ease: EASE }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="flex items-center text-6xl font-bold tracking-tight text-foreground select-none transition-colors duration-500"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: APPEAR / 1000, ease: REVEAL_EASE }}
        >
          <motion.div
            className="flex items-center"
            initial={false}
            animate={{ x: splitting ? '-50vw' : 0 }}
            transition={{ duration: SPLIT / 1000, ease: EASE }}
          >
            <span
              className="flex justify-end overflow-hidden transition-[max-width] duration-700 [transition-timing-function:cubic-bezier(0.45,0,0.15,1)]"
              style={reveal(shown)}
            >
              <span className="whitespace-nowrap">
                <span className="inline-block" style={letterStyle(shown, 0)}>f</span>
                <span className="inline-block" style={letterStyle(shown, STAGGER)}>i</span>
              </span>
            </span>
            <span>Na</span>
          </motion.div>
          <motion.div
            className="flex items-center"
            initial={false}
            animate={{ x: splitting ? '50vw' : 0 }}
            transition={{ duration: SPLIT / 1000, ease: EASE }}
          >
            <span>N</span>
            <span
              className="flex justify-start overflow-hidden transition-[max-width] duration-700 [transition-timing-function:cubic-bezier(0.45,0,0.15,1)]"
              style={reveal(shown)}
            >
              <span className="whitespace-nowrap">
                <span className="inline-block" style={letterStyle(shown, 0)}>c</span>
                <span className="inline-block" style={letterStyle(shown, STAGGER)}>e</span>
              </span>
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
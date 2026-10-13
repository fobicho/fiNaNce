import { useMemo } from 'react'
import { motion } from 'framer-motion'

const COUNT = 14
const SPARK_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)' as const

export function LogoParticles({ visible }: { visible: boolean }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const t = i / (COUNT - 1)
        return {
          id: i,
          x: -16 + t * 64,
          y: -10 + Math.sin(i * 2.4) * 12,
          size: 2 + (i % 3),
          delay: i * 0.06,
          drift: Math.sin(i * 1.7) * 1.4,
          duration: 0.7 + (i % 4) * 0.12
        }
      }),
    []
  )

  if (!visible) return null

  return (
    <div className="absolute left-4 top-8 w-16 h-4 pointer-events-none">
      {sparks.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ width: s.size, height: s.size, left: s.x, top: s.y }}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0.35, 1, 0.35], scale: [0.7, 1, 0.7], y: [0, s.drift, 0] }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: SPARK_EASE
          }}
        />
      ))}
    </div>
  )
}
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export function TypingDots() {
  return (
    <span data-testid="typing-dots" className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

export function TypewriterText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [count, setCount] = useState(0)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const step = Math.max(1, Math.ceil(text.length / 240))

  useEffect(() => {
    if (count >= text.length) {
      onDoneRef.current?.()
      return
    }
    const id = window.setTimeout(() => setCount((c) => Math.min(c + step, text.length)), 14)
    return () => window.clearTimeout(id)
  }, [count, text, step])

  return <>{text.slice(0, count)}</>
}

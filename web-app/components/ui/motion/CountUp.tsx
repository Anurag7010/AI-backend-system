'use client'

import { useRef, useEffect, useState } from 'react'
import { useInView, animate } from 'framer-motion'

interface CountUpProps {
  to: number
  duration?: number
  suffix?: string
  prefix?: string
  className?: string
}

export function CountUp({ to, duration = 1.2, suffix = '', prefix = '', className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        setDisplay(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [inView, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  )
}

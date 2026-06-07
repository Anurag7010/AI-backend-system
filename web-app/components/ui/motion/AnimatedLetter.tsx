'use client'

import { motion, type MotionValue, useTransform } from 'framer-motion'

interface AnimatedLetterProps {
  char: string
  progress: MotionValue<number>
  index: number
  total: number
}

export function AnimatedLetter({ char, progress, index, total }: AnimatedLetterProps) {
  const charProgress = index / total
  const opacity = useTransform(
    progress,
    [Math.max(0, charProgress - 0.1), charProgress + 0.05],
    [0.2, 1]
  )

  return (
    <motion.span style={{ opacity }}>
      {char}
    </motion.span>
  )
}

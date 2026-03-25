'use client'

import { useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'

interface CelebrationOverlayProps {
  trigger: number
}

export function CelebrationOverlay({ trigger }: CelebrationOverlayProps) {
  const fireCelebration = useCallback(() => {
    const duration = 3000
    const end = Date.now() + duration

    const babyBlueColors = ['#4BA3E3', '#89CFF0', '#D96B8F', '#FFD166', '#A8E6CF', '#FFFFFF']

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: babyBlueColors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: babyBlueColors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()

    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: babyBlueColors,
      ticks: 200,
      gravity: 0.8,
      scalar: 1.2,
      shapes: ['circle', 'square'],
    })
  }, [])

  useEffect(() => {
    if (trigger > 0) {
      fireCelebration()
    }
  }, [trigger, fireCelebration])

  return null
}

'use client'

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ReactionGroup } from '@/lib/types'
import { ReactionDetailsSheet } from './ReactionDetailsSheet'

const LONG_PRESS_MS = 500

interface ReactionBarProps {
  reactions: ReactionGroup[]
  onToggle: (emoji: string) => void
}

export function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [initialEmoji, setInitialEmoji] = useState<string | undefined>()
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPressRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }, [])

  const startPress = useCallback(
    (emoji: string) => {
      didLongPressRef.current = false
      clearTimer()
      pressTimerRef.current = setTimeout(() => {
        didLongPressRef.current = true
        setInitialEmoji(emoji)
        setDetailsOpen(true)
      }, LONG_PRESS_MS)
    },
    [clearTimer]
  )

  const endPress = useCallback(
    (emoji: string) => {
      clearTimer()
      if (!didLongPressRef.current) {
        onToggle(emoji)
      }
    },
    [clearTimer, onToggle]
  )

  const cancelPress = useCallback(() => {
    clearTimer()
    didLongPressRef.current = false
  }, [clearTimer])

  if (reactions.length === 0) return null

  return (
    <>
      <div className="mt-1 flex flex-wrap gap-1">
        {reactions.map((reaction) => (
          <motion.button
            key={reaction.emoji}
            whileTap={{ scale: 0.95 }}
            onTouchStart={() => startPress(reaction.emoji)}
            onTouchEnd={(e) => {
              e.preventDefault()
              endPress(reaction.emoji)
            }}
            onTouchMove={cancelPress}
            onTouchCancel={cancelPress}
            onMouseDown={() => startPress(reaction.emoji)}
            onMouseUp={() => endPress(reaction.emoji)}
            onMouseLeave={cancelPress}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
            className={cn(
              'flex select-none items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
              reaction.hasReacted
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-white text-muted-foreground hover:border-primary/20 hover:bg-primary/5'
            )}
            title={reaction.members.map((m) => m.first_name).join(', ')}
          >
            <span>{reaction.emoji}</span>
            <span className="font-medium">{reaction.count}</span>
          </motion.button>
        ))}
      </div>

      <ReactionDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        reactions={reactions}
        initialEmoji={initialEmoji}
      />
    </>
  )
}

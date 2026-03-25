'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ReactionGroup } from '@/lib/types'

interface ReactionBarProps {
  reactions: ReactionGroup[]
  onToggle: (emoji: string) => void
}

export function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  if (reactions.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map((reaction) => (
        <motion.button
          key={reaction.emoji}
          whileTap={{ scale: 0.9 }}
          onClick={() => onToggle(reaction.emoji)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
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
  )
}

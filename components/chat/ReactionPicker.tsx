'use client'

import { motion } from 'framer-motion'
import { REACTION_EMOJIS } from '@/lib/types'

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
}

export function ReactionPicker({ onSelect }: ReactionPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-0.5 rounded-full border bg-white px-2 py-1 shadow-lg"
    >
      {REACTION_EMOJIS.map(({ emoji, label }) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="rounded-full p-1.5 text-lg transition-transform hover:scale-125 hover:bg-muted"
          aria-label={label}
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  )
}

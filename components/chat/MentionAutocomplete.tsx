'use client'

import { motion } from 'framer-motion'
import type { Member } from '@/lib/types'

interface MentionAutocompleteProps {
  query: string
  members: Member[]
  onSelect: (member: Member) => void
  onClose: () => void
}

export function MentionAutocomplete({
  query,
  members,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const filtered = members.filter((m) =>
    `${m.first_name} ${m.last_name}`
      .toLowerCase()
      .includes(query.toLowerCase())
  )

  if (filtered.length === 0) {
    onClose()
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="border-b bg-white shadow-sm"
    >
      <div className="max-h-40 overflow-y-auto p-1">
        {filtered.slice(0, 8).map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: member.avatar_color }}
            >
              {member.first_name[0]}{member.last_name[0]}
            </div>
            <span className="font-medium">
              {member.first_name} {member.last_name}
            </span>
            {member.is_admin && (
              <span className="text-[10px] text-primary">Parent</span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

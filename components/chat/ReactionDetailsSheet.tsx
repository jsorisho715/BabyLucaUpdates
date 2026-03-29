'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ReactionGroup } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ReactionDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reactions: ReactionGroup[]
  initialEmoji?: string
}

export function ReactionDetailsSheet({
  open,
  onOpenChange,
  reactions,
  initialEmoji,
}: ReactionDetailsSheetProps) {
  const [activeEmoji, setActiveEmoji] = useState<string | null>(
    initialEmoji ?? null
  )

  useEffect(() => {
    if (open) {
      setActiveEmoji(initialEmoji ?? null)
    }
  }, [open, initialEmoji])

  const filteredReactions = activeEmoji
    ? reactions.filter((r) => r.emoji === activeEmoji)
    : reactions

  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm gap-0 p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">Reactions</DialogTitle>
        </DialogHeader>

        {reactions.length > 1 && (
          <div className="flex gap-1 overflow-x-auto px-4 pb-2">
            <button
              onClick={() => setActiveEmoji(null)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                activeEmoji === null
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-white text-muted-foreground hover:bg-muted'
              )}
            >
              All
              <span className="text-[10px] opacity-70">{totalCount}</span>
            </button>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => setActiveEmoji(r.emoji)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  activeEmoji === r.emoji
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-white text-muted-foreground hover:bg-muted'
                )}
              >
                <span className="text-sm">{r.emoji}</span>
                <span className="text-[10px] opacity-70">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto px-4 pb-4">
          {filteredReactions.map((reaction) => (
            <div key={reaction.emoji} className="mb-3 last:mb-0">
              {(!activeEmoji || reactions.length <= 1) && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="text-base">{reaction.emoji}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {reaction.count}
                  </span>
                </div>
              )}
              <div className="space-y-1.5">
                {reaction.members.map((member) => (
                  <div
                    key={`${reaction.emoji}-${member.id}`}
                    className="flex items-center gap-2.5"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {member.first_name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-sm text-foreground">
                      {member.first_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

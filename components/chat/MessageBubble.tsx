'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Message, Member } from '@/lib/types'
import { ReactionBar } from './ReactionBar'
import { ReactionPicker } from './ReactionPicker'
import { Reply, SmilePlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MessageBubbleProps {
  message: Message
  currentMemberId: string
  onReply: (message: Message) => void
  onReaction: (messageId: string, emoji: string) => void
  onMediaClick: (url: string, type: 'image' | 'video') => void
  isGrouped: boolean
}

export function MessageBubble({
  message,
  currentMemberId,
  onReply,
  onReaction,
  onMediaClick,
  isGrouped,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false)
  const isOwn = message.member_id === currentMemberId
  const member = message.member as Member

  if (message.type === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center py-2"
      >
        <p className="rounded-full bg-muted px-4 py-1.5 text-xs text-muted-foreground">
          {message.content}
        </p>
      </motion.div>
    )
  }

  const initials = member
    ? `${member.first_name[0]}${member.last_name[0]}`
    : '?'

  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative flex gap-2.5 px-4 py-0.5',
        isGrouped ? 'pt-0.5' : 'pt-3',
        isOwn && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Avatar */}
      {!isGrouped ? (
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: member?.avatar_color || '#4BA3E3' }}
        >
          {initials}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* Message content */}
      <div className={cn('max-w-[75%] min-w-0', isOwn && 'items-end')}>
        {/* Name + time */}
        {!isGrouped && (
          <div className={cn('mb-1 flex items-center gap-2', isOwn && 'flex-row-reverse')}>
            <span className="text-sm font-semibold text-foreground">
              {member?.first_name} {member?.last_name}
            </span>
            {member?.is_admin && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                Parent
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
          </div>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div
            className={cn(
              'mb-1 rounded-lg border-l-2 border-primary/40 bg-muted/50 px-3 py-1.5 text-xs',
              isOwn && 'border-r-2 border-l-0'
            )}
          >
            <span className="font-medium text-primary">
              {(message.reply_to as Message & { member: Member }).member?.first_name}
            </span>
            <p className="truncate text-muted-foreground">
              {(message.reply_to as Message).content || '📷 Photo'}
            </p>
          </div>
        )}

        {/* Text content */}
        {message.content && message.type === 'text' && (
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2',
              isOwn
                ? 'rounded-tr-sm bg-primary text-primary-foreground'
                : 'rounded-tl-sm bg-white shadow-sm ring-1 ring-border/50'
            )}
          >
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {renderContentWithMentions(message.content)}
            </p>
          </div>
        )}

        {/* Media */}
        {message.media && message.media.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.media.map((m) => (
              <div
                key={m.id}
                className="cursor-pointer overflow-hidden rounded-xl"
                onClick={() => onMediaClick(m.url, m.type)}
              >
                {m.type === 'image' ? (
                  <Image
                    src={m.url}
                    alt="Shared photo"
                    width={m.width || 400}
                    height={m.height || 300}
                    className="max-h-80 w-auto rounded-xl object-cover transition-transform hover:scale-[1.02]"
                    sizes="(max-width: 640px) 75vw, 400px"
                  />
                ) : (
                  <video
                    src={m.url}
                    controls
                    preload="metadata"
                    className="max-h-80 w-full rounded-xl"
                    playsInline
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <ReactionBar
            reactions={message.reactions}
            onToggle={(emoji) => onReaction(message.id, emoji)}
          />
        )}
      </div>

      {/* Action buttons (visible on hover) */}
      <div
        className={cn(
          'absolute top-0 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100',
          isOwn ? 'left-[calc(25%+2.5rem)]' : 'right-[calc(25%+2.5rem)]'
        )}
      >
        <button
          onClick={() => onReply(message)}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Reply"
        >
          <Reply className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setShowReactions(!showReactions)}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="React"
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Reaction picker popup */}
      {showReactions && (
        <div
          className={cn(
            'absolute -top-10 z-20',
            isOwn ? 'right-12' : 'left-12'
          )}
        >
          <ReactionPicker
            onSelect={(emoji) => {
              onReaction(message.id, emoji)
              setShowReactions(false)
            }}
          />
        </div>
      )}
    </motion.div>
  )
}

function renderContentWithMentions(content: string) {
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="font-semibold text-blue-200">
          {part}
        </span>
      )
    }
    return part
  })
}

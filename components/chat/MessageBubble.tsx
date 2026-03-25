'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { formatDistanceToNow, isValid } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Message, Member } from '@/lib/types'
import { ReactionBar } from './ReactionBar'
import { ReactionPicker } from './ReactionPicker'
import { Reply, SmilePlus, Pin, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MessageBubbleProps {
  message: Message
  currentMemberId: string
  isAdmin: boolean
  onReply: (message: Message) => void
  onReaction: (messageId: string, emoji: string) => void
  onMediaClick: (url: string, type: 'image' | 'video' | 'audio') => void
  onPin?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  isGrouped: boolean
  isPinned?: boolean
}

export function MessageBubble({
  message,
  currentMemberId,
  isAdmin,
  onReply,
  onReaction,
  onMediaClick,
  onPin,
  onDelete,
  isGrouped,
  isPinned,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOwn = message.member_id === currentMemberId
  const member = message.member as Member

  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current)
    }
  }, [])

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
    ? `${member.first_name?.[0] ?? ''}${member.last_name?.[0] ?? ''}`
    : '?'

  const createdDate = new Date(message.created_at)
  const timeAgo = isValid(createdDate)
    ? formatDistanceToNow(createdDate, { addSuffix: true })
    : ''

  const handleMouseEnter = () => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current)
    setShowActions(true)
  }

  const handleMouseLeave = () => {
    actionTimeoutRef.current = setTimeout(() => {
      setShowActions(false)
      setShowReactionPicker(false)
    }, 200)
  }

  const handleTap = () => {
    setShowActions((prev) => !prev)
    if (showActions) setShowReactionPicker(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group flex gap-2.5 px-4 py-0.5',
        isGrouped ? 'pt-0.5' : 'pt-3',
        isOwn && 'flex-row-reverse'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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

      {/* Message content wrapper -- action buttons anchor to this */}
      <div
        className={cn('relative max-w-[75%] min-w-0', isOwn && 'flex flex-col items-end')}
        onTouchEnd={handleTap}
      >
        {/* Pinned indicator */}
        {isPinned && (
          <div className="mb-0.5 flex items-center gap-1 text-[10px] text-primary">
            <Pin className="h-3 w-3" />
            <span className="font-medium">Pinned</span>
          </div>
        )}

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
              'mb-1 w-full rounded-lg border-l-2 border-primary/40 bg-muted/50 px-3 py-1.5 text-xs',
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
              {renderContentWithMentions(message.content, isOwn)}
            </p>
          </div>
        )}

        {/* Audio message */}
        {message.type === 'audio' && message.media && message.media.length > 0 && message.media[0]?.url && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-2xl px-4 py-2.5',
              isOwn
                ? 'rounded-tr-sm bg-primary text-primary-foreground'
                : 'rounded-tl-sm bg-white shadow-sm ring-1 ring-border/50'
            )}
          >
            <audio
              src={message.media[0].url}
              controls
              preload="metadata"
              className="h-8 max-w-[220px]"
            />
          </div>
        )}

        {/* Media */}
        {message.media && message.media.length > 0 && message.type !== 'audio' && (
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

        {/* Action buttons -- anchored above the message bubble */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
              className={cn(
                'absolute -top-8 z-20 flex items-center gap-0.5 rounded-full border bg-white px-1 py-0.5 shadow-sm',
                isOwn ? 'right-0' : 'left-0'
              )}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onReply(message) }}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Reply"
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowReactionPicker(!showReactionPicker) }}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="React"
              >
                <SmilePlus className="h-3.5 w-3.5" />
              </button>
              {isAdmin && onPin && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPin(message.id) }}
                  className={cn(
                    'rounded-full p-1.5 transition-colors hover:bg-muted',
                    isPinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-label={isPinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className="h-3.5 w-3.5" />
                </button>
              )}
              {isAdmin && onDelete && message.type !== 'system' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this message?')) {
                      onDelete(message.id)
                    }
                  }}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label="Delete message"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction picker popup */}
        <AnimatePresence>
          {showReactionPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'absolute -top-16 z-30',
                isOwn ? 'right-0' : 'left-0'
              )}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <ReactionPicker
                onSelect={(emoji) => {
                  onReaction(message.id, emoji)
                  setShowReactionPicker(false)
                  setShowActions(false)
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function renderContentWithMentions(content: string, isOwn: boolean) {
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className={cn('font-semibold', isOwn ? 'text-blue-100' : 'text-primary')}>
          {part}
        </span>
      )
    }
    return part
  })
}

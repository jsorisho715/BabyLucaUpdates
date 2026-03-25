'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useMessages } from '@/hooks/useMessages'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import type { Message, Member } from '@/lib/types'
import { MessageBubble } from './MessageBubble'
import { MessageComposer } from './MessageComposer'
import { MediaViewer } from './MediaViewer'
import { MemberDrawer } from './MemberDrawer'
import { CelebrationOverlay } from './CelebrationOverlay'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Baby, ArrowDown, Loader2 } from 'lucide-react'
import { SessionPayload } from '@/lib/session'

interface ChatRoomProps {
  session: SessionPayload
}

export function ChatRoom({ session }: ChatRoomProps) {
  const { messages, isLoading, hasMore, fetchMessages, loadMore, addMessage, updateReactions } =
    useMessages()
  const [members, setMembers] = useState<Member[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [celebrationTrigger, setCelebrationTrigger] = useState(0)
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  const handleCelebration = useCallback(() => {
    setCelebrationTrigger((p) => p + 1)
  }, [])

  const handleReactionChange = useCallback(async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages?limit=1&messageId=${messageId}`)
      if (!res.ok) return
      const data = await res.json()
      const msg = data.messages?.find((m: Message) => m.id === messageId)
      if (msg?.reactions) {
        updateReactions(messageId, msg.reactions)
      }
    } catch {
      // silently fail on reaction refresh
    }
  }, [updateReactions])

  const { sendCelebration, onlineCount } = useRealtimeChat({
    onNewMessage: addMessage,
    onNewMember: (member) => {
      setMembers((prev) => {
        if (prev.some((m) => m.id === member.id)) return prev
        return [...prev, member]
      })
    },
    onReactionChange: handleReactionChange,
    onCelebration: handleCelebration,
    currentMemberId: session.memberId,
  })

  useEffect(() => {
    fetchMessages()
    fetchMembers()
  }, [fetchMessages])

  async function fetchMembers() {
    try {
      const res = await fetch('/api/members')
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollDown(!isNearBottomRef.current && messages.length > 0)

    if (scrollTop < 100 && hasMore && !isLoading) {
      loadMore()
    }
  }, [hasMore, isLoading, loadMore, messages.length])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (data: {
    content?: string
    type: 'text' | 'image' | 'video'
    replyToId?: string | null
    mediaUrls?: { url: string; type: 'image' | 'video'; sizeBytes?: number }[]
    mentions?: string[]
  }) => {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to send')
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      })

      if (!res.ok) {
        toast.error('Failed to react')
      }
    } catch {
      toast.error('Failed to react')
    }
  }

  const isGrouped = (index: number) => {
    if (index === 0) return false
    const prev = messages[index - 1]
    const curr = messages[index]
    if (!prev || !curr) return false
    if (prev.member_id !== curr.member_id) return false
    if (prev.type === 'system' || curr.type === 'system') return false

    const prevTime = new Date(prev.created_at).getTime()
    const currTime = new Date(curr.created_at).getTime()
    return currTime - prevTime < 2 * 60 * 1000
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Baby className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">{"Luca's Updates"}</h1>
            <p className="text-xs text-muted-foreground">
              {onlineCount} online
            </p>
          </div>
        </div>
        <MemberDrawer members={members} onlineCount={onlineCount} />
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Load more indicator */}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Baby className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{"Welcome to Luca's Updates!"}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              This is where all the magic happens. Stay tuned for real-time updates
              as Baby Luca makes his grand entrance.
            </p>
          </div>
        )}

        {/* Initial loading */}
        {isLoading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Message list */}
        <div className="py-2">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentMemberId={session.memberId}
              onReply={setReplyTo}
              onReaction={handleReaction}
              onMediaClick={(url, type) => setMediaViewer({ url, type })}
              isGrouped={isGrouped(index)}
            />
          ))}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-xs font-medium text-primary shadow-lg transition-transform hover:scale-105"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          New messages
        </button>
      )}

      {/* Composer */}
      <MessageComposer
        onSend={handleSendMessage}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onCelebrate={sendCelebration}
        members={members}
        currentMemberId={session.memberId}
      />

      {/* Celebration overlay */}
      <CelebrationOverlay trigger={celebrationTrigger} />

      {/* Media viewer */}
      <AnimatePresence>
        {mediaViewer && (
          <MediaViewer
            url={mediaViewer.url}
            type={mediaViewer.type}
            onClose={() => setMediaViewer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

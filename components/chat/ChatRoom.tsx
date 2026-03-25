'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useMessages } from '@/hooks/useMessages'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import type { Message, Member } from '@/lib/types'
import { MessageBubble } from './MessageBubble'
import { MessageComposer } from './MessageComposer'
import { MediaViewer } from './MediaViewer'
import { MemberDrawer } from './MemberDrawer'
import { CelebrationOverlay } from './CelebrationOverlay'
import { BabyStatsCard } from './BabyStatsCard'
import { ShareInvite } from './ShareInvite'
import { Baby, ArrowDown, Loader2, LogOut, Pin } from 'lucide-react'
import { SessionPayload } from '@/lib/session'
import { playNotificationSound } from '@/lib/sounds'

interface ChatRoomProps {
  session: SessionPayload
}

export function ChatRoom({ session }: ChatRoomProps) {
  const { messages, isLoading, hasMore, fetchMessages, loadMore, addMessage, updateReactions, setMessages } =
    useMessages()
  const [members, setMembers] = useState<Member[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [celebrationTrigger, setCelebrationTrigger] = useState(0)
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const router = useRouter()

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
      // silently fail
    }
  }, [updateReactions])

  const handleNewMessage = useCallback((message: Message) => {
    addMessage(message)
    if (message.member_id !== session.memberId) {
      playNotificationSound()
    }
  }, [addMessage, session.memberId, playNotificationSound])

  const handleMessageUpdate = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
    )
  }, [setMessages])

  const { sendCelebration, onlineCount } = useRealtimeChat({
    onNewMessage: handleNewMessage,
    onMessageUpdate: handleMessageUpdate,
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
    type: 'text' | 'image' | 'video' | 'audio'
    replyToId?: string | null
    mediaUrls?: { url: string; type: 'image' | 'video' | 'audio'; sizeBytes?: number }[]
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
      if (!res.ok) toast.error('Failed to react')
    } catch {
      toast.error('Failed to react')
    }
  }

  const handlePin = async (messageId: string) => {
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to pin')
        return
      }

      const data = await res.json()
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_pinned: data.pinned } : m))
      )
      toast.success(data.pinned ? 'Message pinned' : 'Message unpinned')
    } catch {
      toast.error('Failed to pin')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
      router.push('/')
    } catch {
      toast.error('Failed to logout')
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

  const pinnedMessages = messages.filter((m) => m.is_pinned)

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Baby className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">{"Luca's Updates"}</h1>
            <p className="text-xs text-muted-foreground">{onlineCount} online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ShareInvite />
          <MemberDrawer members={members} onlineCount={onlineCount} />
          <button
            onClick={handleLogout}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {/* Baby stats card */}
        <BabyStatsCard isAdmin={session.isAdmin} />

        {/* Pinned messages */}
        {pinnedMessages.length > 0 && (
          <div className="mx-4 mt-3 space-y-2">
            {pinnedMessages.map((msg) => (
              <div key={`pinned-${msg.id}`} className="flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2 ring-1 ring-primary/10">
                <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary">
                    {(msg.member as Member)?.first_name} pinned
                  </p>
                  <p className="truncate text-sm text-foreground">
                    {msg.content || '📷 Photo'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

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
              isAdmin={session.isAdmin}
              onReply={setReplyTo}
              onReaction={handleReaction}
              onMediaClick={(url, type) => { if (type !== 'audio') setMediaViewer({ url, type }) }}
              onPin={session.isAdmin ? handlePin : undefined}
              isGrouped={isGrouped(index)}
              isPinned={message.is_pinned}
            />
          ))}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-xs font-medium text-primary shadow-lg transition-transform hover:scale-105"
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

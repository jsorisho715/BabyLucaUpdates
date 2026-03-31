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
import { Baby, ArrowDown, Loader2, LogOut, Pin, X } from 'lucide-react'
import { SessionPayload } from '@/lib/session'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationSettings } from './NotificationSettings'
import { ChatPdfExport } from './ChatPdfExport'
import { format, isValid, isSameDay } from 'date-fns'

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
  const { prefs: notifPrefs, updatePrefs, requestBrowserPermission, notify } = useNotifications()

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
      const senderName = (message.member as Member)?.first_name || 'Someone'
      const body = message.content
        ? message.content.slice(0, 80)
        : message.type === 'image' ? '📷 Photo' : '📎 Attachment'
      notify(`${senderName} posted an update`, body)
    }
  }, [addMessage, session.memberId, notify])

  const handleOwnNewMember = useCallback((member: Member) => {
    setMembers((prev) => {
      if (prev.some((m) => m.id === member.id)) return prev
      return [...prev, member]
    })
  }, [])

  const handleMessageUpdate = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
    )
  }, [setMessages])

  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }, [setMessages])

  const { sendCelebration, onlineCount } = useRealtimeChat({
    onNewMessage: handleNewMessage,
    onMessageUpdate: handleMessageUpdate,
    onMessageDelete: handleMessageDelete,
    onNewMember: handleOwnNewMember,
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

    const result = await res.json()
    if (result.message) {
      addMessage({ ...result.message, reactions: [] } as Message)
    }

    notify("Luca's Updates", 'Message sent')
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const reactions = [...(m.reactions || [])]
        const idx = reactions.findIndex((r) => r.emoji === emoji)
        if (idx >= 0) {
          const r = reactions[idx]
          if (r.hasReacted) {
            if (r.count <= 1) {
              reactions.splice(idx, 1)
            } else {
              reactions[idx] = {
                ...r,
                count: r.count - 1,
                hasReacted: false,
                members: r.members.filter((mb) => mb.id !== session.memberId),
              }
            }
          } else {
            reactions[idx] = {
              ...r,
              count: r.count + 1,
              hasReacted: true,
              members: [...r.members, { id: session.memberId, first_name: 'You' }],
            }
          }
        } else {
          reactions.push({
            emoji,
            count: 1,
            members: [{ id: session.memberId, first_name: 'You' }],
            hasReacted: true,
          })
        }
        return { ...m, reactions }
      })
    )

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

  const handleDelete = async (messageId: string) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to delete')
        return
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      toast.success('Message deleted')
    } catch {
      toast.error('Failed to delete')
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
    <div className="relative flex h-full flex-col bg-background">
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
          <ChatPdfExport messages={messages} />
          <NotificationSettings
            prefs={notifPrefs}
            onUpdate={updatePrefs}
            onRequestBrowserPermission={requestBrowserPermission}
          />
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
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-primary">
                    {(msg.member as Member)?.first_name} pinned
                  </p>
                  <p className="truncate text-sm text-foreground">
                    {msg.content || '📷 Photo'}
                  </p>
                </div>
                {session.isAdmin && (
                  <button
                    onClick={() => handlePin(msg.id)}
                    className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-500"
                    aria-label="Unpin message"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
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
          {messages.map((message, index) => {
            const currDate = new Date(message.created_at)
            const prevDate = index > 0 ? new Date(messages[index - 1].created_at) : null
            const showDateSep =
              isValid(currDate) &&
              (!prevDate || !isValid(prevDate) || !isSameDay(currDate, prevDate))

            return (
              <div key={message.id}>
                {showDateSep && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {format(currDate, 'MMMM d, yyyy')}
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                )}
                <MessageBubble
                  message={message}
                  currentMemberId={session.memberId}
                  isAdmin={session.isAdmin}
                  onReply={setReplyTo}
                  onReaction={handleReaction}
                  onMediaClick={(url, type) => { if (type !== 'audio') setMediaViewer({ url, type }) }}
                  onPin={session.isAdmin ? handlePin : undefined}
                  onDelete={session.isAdmin ? handleDelete : undefined}
                  isGrouped={isGrouped(index)}
                  isPinned={message.is_pinned}
                />
              </div>
            )
          })}
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

      {/* Composer — parents only */}
      {session.isAdmin && (
        <MessageComposer
          onSend={handleSendMessage}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onCelebrate={sendCelebration}
          members={members}
          currentMemberId={session.memberId}
        />
      )}

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

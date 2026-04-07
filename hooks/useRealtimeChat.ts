'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message, Member } from '@/lib/types'

interface UseRealtimeChatProps {
  onNewMessage: (message: Message) => void
  onMessageUpdate: (messageId: string, updates: Partial<Message>) => void
  onMessageDelete: (messageId: string) => void
  onNewMember: (member: Member) => void
  onReactionChange: (messageId: string) => void
  onCelebration: () => void
  onReadCountChange?: (messageId: string) => void
  currentMemberId: string
}

export function useRealtimeChat({
  onNewMessage,
  onMessageUpdate,
  onMessageDelete,
  onNewMember,
  onReactionChange,
  onCelebration,
  onReadCountChange,
  currentMemberId,
}: UseRealtimeChatProps) {
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const [onlineCount, setOnlineCount] = useState(1)

  const onNewMessageRef = useRef(onNewMessage)
  const onMessageUpdateRef = useRef(onMessageUpdate)
  const onMessageDeleteRef = useRef(onMessageDelete)
  const onNewMemberRef = useRef(onNewMember)
  const onReactionChangeRef = useRef(onReactionChange)
  const onCelebrationRef = useRef(onCelebration)
  const onReadCountChangeRef = useRef(onReadCountChange)
  const currentMemberIdRef = useRef(currentMemberId)

  useEffect(() => { onNewMessageRef.current = onNewMessage }, [onNewMessage])
  useEffect(() => { onMessageUpdateRef.current = onMessageUpdate }, [onMessageUpdate])
  useEffect(() => { onMessageDeleteRef.current = onMessageDelete }, [onMessageDelete])
  useEffect(() => { onNewMemberRef.current = onNewMember }, [onNewMember])
  useEffect(() => { onReactionChangeRef.current = onReactionChange }, [onReactionChange])
  useEffect(() => { onCelebrationRef.current = onCelebration }, [onCelebration])
  useEffect(() => { onReadCountChangeRef.current = onReadCountChange }, [onReadCountChange])
  useEffect(() => { currentMemberIdRef.current = currentMemberId }, [currentMemberId])

  const sendCelebration = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'celebration',
      payload: { memberId: currentMemberIdRef.current },
    })
    onCelebrationRef.current()
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    const memberId = currentMemberId

    const channel = supabase.channel('chat-room', {
      config: {
        presence: { key: memberId },
      },
    })

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const { data: fullMessage } = await supabase
            .from('messages')
            .select(`
              *,
              member:members!member_id(id, first_name, last_name, is_admin, avatar_color),
              media(*),
              reply_to:messages!reply_to_id(
                id, content, type,
                member:members!member_id(id, first_name, last_name, avatar_color)
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (fullMessage) {
            const replyTo = Array.isArray(fullMessage.reply_to)
              ? fullMessage.reply_to[0] ?? null
              : fullMessage.reply_to ?? null
            onNewMessageRef.current({ ...fullMessage, reply_to: replyTo, reactions: [] } as unknown as Message)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as { id: string; is_pinned?: boolean }
          if (updated.id) {
            onMessageUpdateRef.current(updated.id, { is_pinned: updated.is_pinned })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const deleted = payload.old as { id?: string }
          if (deleted?.id) {
            onMessageDeleteRef.current(deleted.id)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        (payload) => {
          const messageId = (payload.new as { message_id?: string })?.message_id ||
            (payload.old as { message_id?: string })?.message_id
          if (messageId) {
            onReactionChangeRef.current(messageId)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'members' },
        (payload) => {
          onNewMemberRef.current(payload.new as Member)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads' },
        (payload) => {
          const read = payload.new as { message_id?: string; member_id?: string }
          if (read.message_id && onReadCountChangeRef.current) {
            onReadCountChangeRef.current(read.message_id)
          }
        }
      )
      .on('broadcast', { event: 'celebration' }, (payload) => {
        if (payload.payload?.memberId !== currentMemberIdRef.current) {
          onCelebrationRef.current()
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineCount(Object.keys(state).length)
      })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() })
      }
    })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMemberId])

  return { sendCelebration, onlineCount }
}

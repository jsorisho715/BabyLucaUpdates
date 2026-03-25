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
  currentMemberId: string
}

export function useRealtimeChat({
  onNewMessage,
  onMessageUpdate,
  onMessageDelete,
  onNewMember,
  onReactionChange,
  onCelebration,
  currentMemberId,
}: UseRealtimeChatProps) {
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const [onlineCount, setOnlineCount] = useState(1)

  const sendCelebration = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'celebration',
      payload: { memberId: currentMemberId },
    })
    onCelebration()
  }, [currentMemberId, onCelebration])

  useEffect(() => {
    const supabase = supabaseRef.current

    const channel = supabase.channel('chat-room', {
      config: {
        presence: { key: currentMemberId },
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
              member:members!member_id(*),
              media(*),
              reply_to:messages!reply_to_id(
                id, content, type,
                member:members!member_id(id, first_name, last_name, avatar_color)
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (fullMessage) {
            onNewMessage({ ...fullMessage, reactions: [] } as unknown as Message)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as { id: string; is_pinned?: boolean }
          if (updated.id) {
            onMessageUpdate(updated.id, { is_pinned: updated.is_pinned })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const deleted = payload.old as { id?: string }
          if (deleted?.id) {
            onMessageDelete(deleted.id)
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
            onReactionChange(messageId)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'members' },
        (payload) => {
          onNewMember(payload.new as Member)
        }
      )
      .on('broadcast', { event: 'celebration' }, (payload) => {
        if (payload.payload?.memberId !== currentMemberId) {
          onCelebration()
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
  }, [currentMemberId, onNewMessage, onMessageUpdate, onMessageDelete, onNewMember, onReactionChange, onCelebration])

  return { sendCelebration, onlineCount }
}

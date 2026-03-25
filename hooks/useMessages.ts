'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import type { Message } from '@/lib/types'

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const loadingRef = useRef(false)

  const fetchMessages = useCallback(async (cursor?: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setIsLoading(true)

    try {
      const params = new URLSearchParams({ limit: '50' })
      if (cursor) params.set('cursor', cursor)

      const res = await fetch(`/api/messages?${params}`)
      if (!res.ok) throw new Error('Failed to fetch messages')

      const data = await res.json()

      setMessages((prev) => {
        if (cursor) {
          const existingIds = new Set(prev.map((m) => m.id))
          const newMessages = data.messages.filter((m: Message) => !existingIds.has(m.id))
          return [...newMessages, ...prev]
        }
        return data.messages
      })
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      if (!cursor) {
        toast.error('Failed to load messages. Pull down to retry.')
      }
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [])

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current || messages.length === 0) return
    const oldestMessage = messages[0]
    if (oldestMessage) {
      fetchMessages(oldestMessage.created_at)
    }
  }, [hasMore, messages, fetchMessages])

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
  }, [])

  const updateReactions = useCallback((messageId: string, reactions: Message['reactions']) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
    )
  }, [])

  return {
    messages,
    isLoading,
    hasMore,
    fetchMessages,
    loadMore,
    addMessage,
    updateReactions,
    setMessages,
  }
}

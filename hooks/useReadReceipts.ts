'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseReadReceiptsOptions {
  currentMemberId: string
  isAdmin: boolean
}

export function useReadReceipts({ currentMemberId, isAdmin }: UseReadReceiptsOptions) {
  const pendingReadsRef = useRef<Set<string>>(new Set())
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentReadsRef = useRef<Set<string>>(new Set())

  const flush = useCallback(async () => {
    if (pendingReadsRef.current.size === 0) return

    const messageIds = Array.from(pendingReadsRef.current)
    pendingReadsRef.current.clear()

    try {
      await fetch('/api/reads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      })
    } catch {
      messageIds.forEach((id) => sentReadsRef.current.delete(id))
    }
  }, [])

  const markAsRead = useCallback((messageId: string) => {
    if (isAdmin) return
    if (sentReadsRef.current.has(messageId)) return

    sentReadsRef.current.add(messageId)
    pendingReadsRef.current.add(messageId)

    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = setTimeout(flush, 1000)
  }, [isAdmin, flush])

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      if (pendingReadsRef.current.size > 0) {
        const messageIds = Array.from(pendingReadsRef.current)
        navigator.sendBeacon?.(
          '/api/reads',
          new Blob(
            [JSON.stringify({ messageIds })],
            { type: 'application/json' }
          )
        )
      }
    }
  }, [])

  return { markAsRead, currentMemberId }
}

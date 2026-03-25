'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, isValid } from 'date-fns'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Note, Member } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Send, Loader2, BookHeart } from 'lucide-react'

interface NotesTabProps {
  currentMemberId: string
}

function safeTimeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : ''
}

export function NotesTab({ currentMemberId }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const supabaseRef = useRef(createClient())

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setNotes(data.notes || [])
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotes()

    const channel = supabaseRef.current
      .channel('notes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notes' },
        async () => {
          await fetchNotes()
        }
      )
      .subscribe()

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [fetchNotes])

  const handleSend = async () => {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      setNotes((prev) => [data.note, ...prev])
      setContent('')
      toast.success('Note left for the parents!')
    } catch {
      toast.error('Failed to leave note')
    } finally {
      setIsSending(false)
    }
  }

  const pastelBgs = [
    'bg-blue-50', 'bg-pink-50', 'bg-amber-50', 'bg-green-50',
    'bg-purple-50', 'bg-rose-50', 'bg-sky-50', 'bg-emerald-50',
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-white/80 px-4 py-4 text-center backdrop-blur-sm">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-pink-100">
          <BookHeart className="h-5 w-5 text-pink-500" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Notes for the Parents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Leave a heartfelt message for Jordyn & Johnathan to read later
        </p>
      </div>

      {/* Notes feed */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="mb-3 h-12 w-12 text-pink-200" />
            <p className="text-sm text-muted-foreground">
              No notes yet. Be the first to leave a message!
            </p>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {notes.map((note, idx) => {
              const member = note.member as Member | undefined
              const bgClass = pastelBgs[idx % pastelBgs.length]
              const isOwn = note.member_id === currentMemberId

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  className={`rounded-2xl ${bgClass} p-4 shadow-sm`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: member?.avatar_color || '#4BA3E3' }}
                    >
                      {member?.first_name?.[0] ?? '?'}{member?.last_name?.[0] ?? ''}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {member?.first_name ?? 'Unknown'} {member?.last_name ?? ''}
                    </span>
                    {member?.is_admin && (
                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                        Parent
                      </Badge>
                    )}
                    {isOwn && (
                      <span className="text-[10px] text-muted-foreground">You</span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {note.content}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {safeTimeAgo(note.created_at)}
                  </p>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Compose note */}
      <div className="border-t bg-white/80 p-3 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note for Jordyn & Johnathan..."
            rows={2}
            className="max-h-24 flex-1 resize-none rounded-xl border-border/50 bg-muted/50 px-3 py-2 text-sm"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={handleSend}
            disabled={!content.trim() || isSending}
            aria-label="Send note"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

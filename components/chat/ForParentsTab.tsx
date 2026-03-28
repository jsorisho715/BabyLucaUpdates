'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isValid } from 'date-fns'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Note, Member, HelpOffer } from '@/lib/types'
import { HELP_CATEGORIES } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Heart, Send, Loader2, BookHeart, X,
  UtensilsCrossed, ShoppingBag, Dog, Shirt, Coffee, Sparkles, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, typeof Heart> = {
  UtensilsCrossed,
  Heart,
  ShoppingBag,
  Dog,
  Shirt,
  Sparkles,
  Coffee,
}

const CARD_COLORS: Record<string, { bg: string; iconBg: string; iconColor: string }> = {
  meals: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  visits: { bg: 'bg-pink-50', iconBg: 'bg-pink-100', iconColor: 'text-pink-600' },
  errands: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  walks: { bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  laundry: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
  cleaning: { bg: 'bg-sky-50', iconBg: 'bg-sky-100', iconColor: 'text-sky-600' },
  company: { bg: 'bg-rose-50', iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
}

interface ForParentsTabProps {
  currentMemberId: string
  isAdmin: boolean
}

function safeTimeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : ''
}

export function ForParentsTab({ currentMemberId, isAdmin }: ForParentsTabProps) {
  const [offers, setOffers] = useState<HelpOffer[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [noteContent, setNoteContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [signUpCategory, setSignUpCategory] = useState<string | null>(null)
  const [signUpDate, setSignUpDate] = useState('')
  const [signUpNote, setSignUpNote] = useState('')
  const [isSigningUp, setIsSigningUp] = useState(false)
  const supabaseRef = useRef(createClient())

  const fetchData = useCallback(async () => {
    try {
      const [offersRes, notesRes] = await Promise.all([
        fetch('/api/help-offers'),
        fetch('/api/notes'),
      ])
      if (offersRes.ok) {
        const data = await offersRes.json()
        setOffers(data.offers || [])
      }
      if (notesRes.ok) {
        const data = await notesRes.json()
        setNotes(data.notes || [])
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const supabase = supabaseRef.current
    const helpChannel = supabase
      .channel('help-offers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_offers' }, () => fetchData())
      .subscribe()

    const notesChannel = supabase
      .channel('notes-realtime-for-parents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(helpChannel)
      supabase.removeChannel(notesChannel)
    }
  }, [fetchData])

  const handleSignUp = async () => {
    if (!signUpCategory || isSigningUp) return

    setIsSigningUp(true)
    try {
      const res = await fetch('/api/help-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: signUpCategory,
          availableDate: signUpDate || null,
          note: signUpNote.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      setOffers((prev) => [...prev, data.offer])
      setSignUpCategory(null)
      setSignUpDate('')
      setSignUpNote('')
      toast.success('Thank you for offering to help!')
    } catch {
      toast.error('Failed to sign up')
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleRemoveOffer = async (offerId: string) => {
    try {
      const res = await fetch('/api/help-offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offerId }),
      })

      if (!res.ok) throw new Error('Failed')
      setOffers((prev) => prev.filter((o) => o.id !== offerId))
      toast.success('Removed your sign-up')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const handleSendNote = async () => {
    const trimmed = noteContent.trim()
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
      setNoteContent('')
      toast.success('Note sent!')
    } catch {
      toast.error('Failed to leave note')
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return
    try {
      const res = await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })
      if (!res.ok) throw new Error('Failed')
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      toast.success('Note deleted')
    } catch {
      toast.error('Failed to delete note')
    }
  }

  const getCategoryOffers = (categoryId: string) =>
    offers.filter((o) => o.category === categoryId)

  const getDateWarning = (categoryId: string, date: string): string | null => {
    if (!date) return null
    const count = offers.filter(
      (o) => o.category === categoryId && o.available_date === date
    ).length
    if (count >= 2) return `${count} others already signed up for this day`
    return null
  }

  const pastelBgs = [
    'bg-blue-50', 'bg-pink-50', 'bg-amber-50', 'bg-green-50',
    'bg-purple-50', 'bg-rose-50', 'bg-sky-50', 'bg-emerald-50',
  ]

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Sweet intro */}
        <div className="bg-gradient-to-b from-pink-50/80 to-white px-5 pb-6 pt-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
            <BookHeart className="h-6 w-6 text-pink-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">For the Parents</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The first few weeks with a newborn are magical &mdash; and a little overwhelming!
            If you&apos;d like to lend a hand, here are some small ways that would mean the
            world to us. No pressure at all &mdash; your love and support already means everything.
          </p>
        </div>

        {/* Help categories */}
        <div className="px-4 pb-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Ways You Can Help</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {HELP_CATEGORIES.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || Heart
              const colors = CARD_COLORS[cat.id] || CARD_COLORS.visits
              const catOffers = getCategoryOffers(cat.id)

              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSignUpCategory(cat.id)}
                  className={cn(
                    'relative flex flex-col items-start gap-2 rounded-2xl p-3.5 text-left transition-shadow hover:shadow-md',
                    colors.bg
                  )}
                >
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', colors.iconBg)}>
                    <Icon className={cn('h-4.5 w-4.5', colors.iconColor)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>

                  {catOffers.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {catOffers.map((offer) => {
                        const m = offer.member as Member | undefined
                        const isOwn = offer.member_id === currentMemberId
                        return (
                          <div
                            key={offer.id}
                            className={cn(
                              'group relative flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-[10px]',
                              isOwn ? 'bg-primary/10' : 'bg-white/70'
                            )}
                          >
                            <div
                              className="flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white"
                              style={{ backgroundColor: m?.avatar_color || '#4BA3E3' }}
                            >
                              {m?.first_name?.[0]}
                            </div>
                            <span className="font-medium text-foreground/80">
                              {m?.first_name}
                              {offer.available_date && (
                                <span className="ml-0.5 text-muted-foreground">
                                  {format(new Date(offer.available_date + 'T12:00:00'), 'MMM d')}
                                </span>
                              )}
                            </span>
                            {(isOwn || isAdmin) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveOffer(offer.id)
                                }}
                                className="ml-0.5 hidden rounded-full p-0.5 text-muted-foreground hover:bg-red-100 hover:text-red-500 group-hover:block"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t" />

        {/* Notes section */}
        <div className="px-4 pb-4 pt-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Heart className="h-4 w-4 text-pink-400" />
            Leave a Note
          </h3>

          {/* Compose */}
          <div className="mb-4 flex items-end gap-2">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write a sweet note for Jordyn & Johnathan..."
              rows={2}
              className="max-h-24 flex-1 resize-none rounded-xl border-border/50 bg-muted/50 px-3 py-2 text-sm"
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={handleSendNote}
              disabled={!noteContent.trim() || isSending}
              aria-label="Send note"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Notes feed */}
          {notes.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <Heart className="mb-2 h-8 w-8 text-pink-200" />
              <p className="text-xs text-muted-foreground">No notes yet. Be the first!</p>
            </div>
          )}

          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {notes.map((note, idx) => {
                const member = note.member as Member | undefined
                const bgClass = pastelBgs[idx % pastelBgs.length]

                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className={`rounded-2xl ${bgClass} p-3.5 shadow-sm`}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                        style={{ backgroundColor: member?.avatar_color || '#4BA3E3' }}
                      >
                        {member?.first_name?.[0] ?? '?'}{member?.last_name?.[0] ?? ''}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {member?.first_name ?? 'Unknown'}
                      </span>
                      {member?.is_admin && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px]">Parent</Badge>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="ml-auto rounded-full p-1 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-500"
                          aria-label="Delete note"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{note.content}</p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">{safeTimeAgo(note.created_at)}</p>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Sign-up dialog */}
      <Dialog open={!!signUpCategory} onOpenChange={(o) => !o && setSignUpCategory(null)}>
        <DialogContent className="max-w-sm" aria-describedby="help-signup-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Sign Up to Help
            </DialogTitle>
            <DialogDescription id="help-signup-desc">
              {HELP_CATEGORIES.find((c) => c.id === signUpCategory)?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                When are you available?
              </label>
              <Input
                type="date"
                value={signUpDate}
                onChange={(e) => setSignUpDate(e.target.value)}
                className="rounded-xl"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Leave empty for &quot;anytime / flexible&quot;
              </p>
              {signUpCategory && signUpDate && (() => {
                const warning = getDateWarning(signUpCategory, signUpDate)
                return warning ? (
                  <p className="mt-1 text-[11px] text-amber-600">{warning}</p>
                ) : null
              })()}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Add a note <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                value={signUpNote}
                onChange={(e) => setSignUpNote(e.target.value)}
                placeholder="e.g. I'll bring lasagna!"
                rows={2}
                maxLength={500}
                className="resize-none rounded-xl"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setSignUpCategory(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSignUp} disabled={isSigningUp}>
                {isSigningUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Count Me In'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

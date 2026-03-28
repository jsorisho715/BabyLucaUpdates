'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format, isValid } from 'date-fns'
import { toast } from 'sonner'
import type { BabyStats } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Baby, Scale, Ruler, Clock, Edit2, Loader2, Trash2 } from 'lucide-react'

interface BabyStatsCardProps {
  isAdmin: boolean
}

function safeFormatDate(dateStr: string | null | undefined, fmt: string): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isValid(d) ? format(d, fmt) : null
}

export function BabyStatsCard({ isAdmin }: BabyStatsCardProps) {
  const [stats, setStats] = useState<BabyStats | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/baby-stats')
      .then((r) => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then((d) => setStats(d.stats))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return null

  const hasWeight = stats?.weight_lbs != null || stats?.weight_oz != null
  const hasLength = stats?.length_inches != null
  const hasData = stats?.birth_date || hasWeight

  if (!hasData && !isAdmin) return null

  if (!hasData && isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mx-4 mt-3"
      >
        <button
          onClick={() => setShowEdit(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-primary/50"
        >
          <Baby className="h-5 w-5" />
          Announce Luca&apos;s arrival -- tap to add stats
        </button>
        <EditStatsDialog
          open={showEdit}
          onClose={() => setShowEdit(false)}
          stats={stats}
          onSave={setStats}
        />
      </motion.div>
    )
  }

  const birthFormatted = safeFormatDate(stats?.birth_date, 'MMMM d, yyyy h:mm a')
  const birthTime = safeFormatDate(stats?.birth_date, 'h:mm a')

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-pink-50 to-primary/5 p-4 shadow-sm ring-1 ring-primary/10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Baby className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {stats?.name || 'Luca'} is here! 🎉
              </h3>
              {birthFormatted && (
                <p className="text-sm text-muted-foreground">Born {birthFormatted}</p>
              )}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/50"
              aria-label="Edit baby stats"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {hasWeight && (
            <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
              <Scale className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Weight</p>
                <p className="text-sm font-semibold">
                  {stats?.weight_lbs ?? 0}lb {stats?.weight_oz ?? 0}oz
                </p>
              </div>
            </div>
          )}
          {hasLength && (
            <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
              <Ruler className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Length</p>
                <p className="text-sm font-semibold">{stats?.length_inches}&quot;</p>
              </div>
            </div>
          )}
          {birthTime && (
            <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-semibold">{birthTime}</p>
              </div>
            </div>
          )}
        </div>

        {stats?.notes && (
          <p className="mt-3 text-sm italic text-foreground/80">&ldquo;{stats.notes}&rdquo;</p>
        )}
      </div>

      <EditStatsDialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        stats={stats}
        onSave={setStats}
      />
    </motion.div>
  )
}

function EditStatsDialog({
  open, onClose, stats, onSave,
}: {
  open: boolean
  onClose: () => void
  stats: BabyStats | null
  onSave: (s: BabyStats) => void
}) {
  const [form, setForm] = useState(getFormDefaults(stats))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(getFormDefaults(stats))
    }
  }, [open, stats])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/baby-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          birth_date: form.birth_date ? new Date(form.birth_date).toISOString() : null,
          weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
          weight_oz: form.weight_oz ? parseFloat(form.weight_oz) : null,
          length_inches: form.length_inches ? parseFloat(form.length_inches) : null,
          notes: form.notes || null,
        }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      onSave(data.stats)
      onClose()
      toast.success('Baby stats updated!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearAll = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/baby-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Luca',
          birth_date: null,
          weight_lbs: null,
          weight_oz: null,
          length_inches: null,
          notes: null,
        }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      onSave(data.stats)
      setForm(getFormDefaults(data.stats))
      onClose()
      toast.success('Baby stats cleared!')
    } catch {
      toast.error('Failed to clear stats')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm" aria-describedby="baby-stats-dialog-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-primary" />
            Baby Stats
          </DialogTitle>
          <DialogDescription id="baby-stats-dialog-desc">
            Fill in the details to announce Luca&apos;s arrival
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date & Time of Birth</Label>
            <Input
              type="datetime-local"
              value={form.birth_date}
              onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Weight (lbs)</Label>
              <Input
                type="number"
                value={form.weight_lbs}
                onChange={(e) => setForm((f) => ({ ...f, weight_lbs: e.target.value }))}
                className="h-9"
                placeholder="7"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Weight (oz)</Label>
              <Input
                type="number"
                value={form.weight_oz}
                onChange={(e) => setForm((f) => ({ ...f, weight_oz: e.target.value }))}
                className="h-9"
                placeholder="8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Length (inches)</Label>
            <Input
              type="number"
              value={form.length_inches}
              onChange={(e) => setForm((f) => ({ ...f, length_inches: e.target.value }))}
              className="h-9"
              placeholder="20"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Note (optional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="h-9"
              placeholder="Perfect in every way"
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Stats'}
          </Button>
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleClearAll}
            disabled={isSaving}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getFormDefaults(stats: BabyStats | null) {
  return {
    name: stats?.name || 'Luca',
    birth_date: stats?.birth_date ? stats.birth_date.slice(0, 16) : '',
    weight_lbs: stats?.weight_lbs?.toString() || '',
    weight_oz: stats?.weight_oz?.toString() || '',
    length_inches: stats?.length_inches?.toString() || '',
    notes: stats?.notes || '',
  }
}

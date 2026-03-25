'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'
import type { VisionBoardItem, Member } from '@/lib/types'
import { STICKY_NOTE_COLORS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, Image as ImageIcon, StickyNote, ZoomIn, ZoomOut,
  Loader2, X, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VisionBoardProps {
  currentMemberId: string
}

export function VisionBoard({ currentMemberId }: VisionBoardProps) {
  const [items, setItems] = useState<VisionBoardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState<'photo' | 'note' | null>(null)

  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const translateStartRef = useRef({ x: 0, y: 0 })
  const lastTouchDistRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const BOARD_W = 2000
  const BOARD_H = 2000

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/vision-board')
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale((s) => Math.max(0.3, Math.min(3, s + delta)))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains('board-bg')) return
    setIsPanning(true)
    panStartRef.current = { x: e.clientX, y: e.clientY }
    translateStartRef.current = { ...translate }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [translate])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    setTranslate({
      x: translateStartRef.current.x + dx,
      y: translateStartRef.current.y + dy,
    })
  }, [isPanning])

  const handlePointerUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (lastTouchDistRef.current > 0) {
        const pinchScale = dist / lastTouchDistRef.current
        setScale((s) => Math.max(0.3, Math.min(3, s * pinchScale)))
      }
      lastTouchDistRef.current = dist
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    lastTouchDistRef.current = 0
  }, [])

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.2))
  const zoomOut = () => setScale((s) => Math.max(0.3, s - 0.2))
  const resetView = () => { setScale(1); setTranslate({ x: 0, y: 0 }) }

  const hasOwnItem = items.some((i) => i.member_id === currentMemberId)

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="relative z-10 border-b bg-white/80 px-4 py-3 text-center backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{"Luca's Vision Board"}</h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Add a photo or note for Luca to see when he grows up
        </p>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="board-bg relative flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Transform container */}
        <div
          className="board-bg absolute origin-center transition-transform duration-100"
          style={{
            width: BOARD_W,
            height: BOARD_H,
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${translate.x}px), calc(-50% + ${translate.y}px)) scale(${scale})`,
          }}
        >
          {/* Dot grid pattern */}
          <div
            className="board-bg absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, hsl(201, 79%, 56%) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Board items */}
          {items.map((item) => (
            <BoardItem key={item.id} item={item} boardWidth={BOARD_W} boardHeight={BOARD_H} />
          ))}

          {/* Empty state hint */}
          {!isLoading && items.length === 0 && (
            <div className="board-bg absolute inset-0 flex items-center justify-center">
              <p className="rounded-xl bg-white/60 px-6 py-3 text-sm text-muted-foreground backdrop-blur-sm">
                Tap the + button to add your photo or note
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute right-3 bottom-16 z-10 flex flex-col gap-1.5">
        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full shadow-md" onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full shadow-md" onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full text-xs shadow-md" onClick={resetView}>
          1:1
        </Button>
      </div>

      {/* Add FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAddDialog(true)}
        className="absolute bottom-16 left-1/2 z-10 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-white shadow-lg transition-shadow hover:shadow-xl"
      >
        <Plus className="h-5 w-5" />
        {hasOwnItem ? 'Replace Your Item' : 'Add to Board'}
      </motion.button>

      {/* Add dialog */}
      <AddItemDialog
        open={showAddDialog}
        onClose={() => { setShowAddDialog(false); setAddType(null) }}
        addType={addType}
        setAddType={setAddType}
        onAdded={(item) => {
          setItems((prev) => {
            const filtered = prev.filter((i) => i.member_id !== currentMemberId)
            return [...filtered, item]
          })
          setShowAddDialog(false)
          setAddType(null)
        }}
      />
    </div>
  )
}

function BoardItem({ item, boardWidth, boardHeight }: { item: VisionBoardItem; boardWidth: number; boardHeight: number }) {
  const member = item.member as Member
  const x = item.x * boardWidth
  const y = item.y * boardHeight

  if (item.type === 'note') {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute"
        style={{
          left: x,
          top: y,
          transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
          width: 200,
        }}
      >
        <div
          className="rounded-lg p-4 shadow-md transition-shadow hover:shadow-lg"
          style={{ backgroundColor: item.color }}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800" style={{ fontFamily: "'Caveat', cursive, sans-serif" }}>
            {item.content}
          </p>
          <div className="mt-2 flex items-center gap-1.5 border-t border-black/5 pt-2">
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
              style={{ backgroundColor: member?.avatar_color || '#4BA3E3' }}
            >
              {member?.first_name?.[0]}{member?.last_name?.[0]}
            </div>
            <span className="text-[10px] text-gray-600">{member?.first_name}</span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
      }}
    >
      <div className="rounded-lg bg-white p-2 shadow-md transition-shadow hover:shadow-lg" style={{ width: 200 }}>
        <div className="overflow-hidden rounded">
          <Image
            src={item.content}
            alt={`${member?.first_name}'s photo`}
            width={200}
            height={200}
            className="h-44 w-full object-cover"
          />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 px-1">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ backgroundColor: member?.avatar_color || '#4BA3E3' }}
          >
            {member?.first_name?.[0]}{member?.last_name?.[0]}
          </div>
          <span className="text-[10px] text-gray-600">{member?.first_name}</span>
        </div>
      </div>
    </motion.div>
  )
}

function AddItemDialog({
  open, onClose, addType, setAddType, onAdded,
}: {
  open: boolean
  onClose: () => void
  addType: 'photo' | 'note' | null
  setAddType: (t: 'photo' | 'note' | null) => void
  onAdded: (item: VisionBoardItem) => void
}) {
  const [noteText, setNoteText] = useState('')
  const [noteColor, setNoteColor] = useState<string>(STICKY_NOTE_COLORS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSubmitting(true)
    try {
      let fileToUpload: File | Blob = file
      if (file.size > 2 * 1024 * 1024) {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        })
      }

      const formData = new FormData()
      formData.append('file', fileToUpload, file.name)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { url } = await uploadRes.json()

      const res = await fetch('/api/vision-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          content: url,
          x: 0.3 + Math.random() * 0.4,
          y: 0.3 + Math.random() * 0.4,
        }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      onAdded(data.item)
      toast.success('Photo added to the board!')
    } catch {
      toast.error('Failed to add photo')
    } finally {
      setIsSubmitting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleNoteSubmit = async () => {
    if (!noteText.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/vision-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          content: noteText.trim(),
          color: noteColor,
          x: 0.3 + Math.random() * 0.4,
          y: 0.3 + Math.random() * 0.4,
        }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      onAdded(data.item)
      setNoteText('')
      toast.success('Note added to the board!')
    } catch {
      toast.error('Failed to add note')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add to Vision Board
          </DialogTitle>
        </DialogHeader>

        {!addType ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setAddType('photo')}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <ImageIcon className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Photo</span>
            </button>
            <button
              onClick={() => setAddType('note')}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-amber-400 hover:bg-amber-50"
            >
              <StickyNote className="h-8 w-8 text-amber-500" />
              <span className="text-sm font-medium">Sticky Note</span>
            </button>
          </div>
        ) : addType === 'photo' ? (
          <div className="space-y-4 pt-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isSubmitting}
              className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 transition-colors hover:border-primary/50"
            >
              {isSubmitting ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <ImageIcon className="h-8 w-8 text-primary" />
              )}
              <span className="text-sm text-muted-foreground">
                {isSubmitting ? 'Uploading...' : 'Tap to choose a photo'}
              </span>
            </button>
            <Button variant="ghost" className="w-full" onClick={() => setAddType(null)}>
              <X className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a message for Luca..."
              rows={4}
              maxLength={300}
              className="resize-none rounded-xl"
              style={{ backgroundColor: noteColor }}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Color:</span>
              {STICKY_NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNoteColor(color)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                    noteColor === color ? 'border-primary scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setAddType(null)}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleNoteSubmit}
                disabled={!noteText.trim() || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Note'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

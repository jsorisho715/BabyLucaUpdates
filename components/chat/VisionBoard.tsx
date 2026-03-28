'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'
import { uploadFile } from '@/lib/upload'
import { createClient } from '@/lib/supabase/client'
import type { VisionBoardItem, Member } from '@/lib/types'
import { STICKY_NOTE_COLORS, BOARD_STICKERS, WISH_THEMES, STAR_PROMPTS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus, Image as ImageIcon, StickyNote, ZoomIn, ZoomOut,
  Loader2, X, Sparkles, GripVertical, Smile, Heart, Star, Pencil, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_ITEMS_PER_USER = 5

type AddItemType = 'photo' | 'note' | 'sticker' | 'wish' | 'doodle' | 'star' | null

interface VisionBoardProps {
  currentMemberId: string
}

export function VisionBoard({ currentMemberId }: VisionBoardProps) {
  const [items, setItems] = useState<VisionBoardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState<AddItemType>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const translateStartRef = useRef({ x: 0, y: 0 })
  const lastTouchDistRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragItemIdRef = useRef<string | null>(null)

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

  useEffect(() => {
    fetchItems()

    const supabase = createClient()
    const channel = supabase
      .channel('vision-board-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vision_board_items' },
        () => { fetchItems() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchItems])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale((s) => Math.max(0.3, Math.min(3, s + delta)))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      const id = dragItemIdRef.current
      if (!id) return
      e.preventDefault()

      const dx = (e.clientX - dragStartRef.current.x) / scale
      const dy = (e.clientY - dragStartRef.current.y) / scale
      dragStartRef.current = { x: e.clientX, y: e.clientY }

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item
          return {
            ...item,
            x: Math.max(0.02, Math.min(0.98, item.x + dx / BOARD_W)),
            y: Math.max(0.02, Math.min(0.98, item.y + dy / BOARD_H)),
          }
        })
      )
    }

    const handleGlobalUp = async () => {
      const id = dragItemIdRef.current
      if (!id) return
      dragItemIdRef.current = null
      setDraggingId(null)

      const item = items.find((i) => i.id === id)
      if (item) {
        try {
          await fetch('/api/vision-board', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, x: item.x, y: item.y }),
          })
        } catch {
          // silently fail
        }
      }
    }

    window.addEventListener('pointermove', handleGlobalMove)
    window.addEventListener('pointerup', handleGlobalUp)
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove)
      window.removeEventListener('pointerup', handleGlobalUp)
    }
  }, [scale, items])

  const startItemDrag = useCallback((itemId: string, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragItemIdRef.current = itemId
    setDraggingId(itemId)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-board-item]')) return
    if (target !== containerRef.current && !target.classList.contains('board-bg')) return
    setIsPanning(true)
    panStartRef.current = { x: e.clientX, y: e.clientY }
    translateStartRef.current = { ...translate }
    target.setPointerCapture(e.pointerId)
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

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!confirm('Remove this from the board?')) return
    try {
      const res = await fetch('/api/vision-board', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId }),
      })
      if (!res.ok) throw new Error('Failed')
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      toast.success('Item removed')
    } catch {
      toast.error('Failed to remove')
    }
  }, [])

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.2))
  const zoomOut = () => setScale((s) => Math.max(0.3, s - 0.2))
  const resetView = () => { setScale(1); setTranslate({ x: 0, y: 0 }) }

  const ownItemCount = items.filter((i) => i.member_id === currentMemberId).length
  const canAddMore = ownItemCount < MAX_ITEMS_PER_USER

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      <div className="relative z-10 border-b bg-white/80 px-4 py-3 text-center backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{"Luca's Notes"}</h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Add up to {MAX_ITEMS_PER_USER} items for Luca &mdash; drag to rearrange
        </p>
      </div>

      <div
        ref={containerRef}
        className="board-bg relative flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
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

        <div
          className="board-bg absolute origin-center"
          style={{
            width: BOARD_W,
            height: BOARD_H,
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${translate.x}px), calc(-50% + ${translate.y}px)) scale(${scale})`,
            transition: isPanning || draggingId ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <div
            className="board-bg absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, hsl(201, 79%, 56%) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {items.map((item) => (
            <BoardItem
              key={item.id}
              item={item}
              boardWidth={BOARD_W}
              boardHeight={BOARD_H}
              isOwn={item.member_id === currentMemberId}
              isDragging={draggingId === item.id}
              onDragStart={(e) => startItemDrag(item.id, e)}
              onDelete={() => handleDeleteItem(item.id)}
            />
          ))}

          {!isLoading && items.length === 0 && (
            <div className="board-bg absolute inset-0 flex items-center justify-center">
              <p className="rounded-xl bg-white/60 px-6 py-3 text-sm text-muted-foreground backdrop-blur-sm">
                Tap the + button to add something for Luca
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-3 bottom-16 z-10 flex flex-col gap-1.5">
        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full shadow-md" onClick={zoomIn} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full shadow-md" onClick={zoomOut} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full text-xs shadow-md" onClick={resetView} aria-label="Reset zoom">
          1:1
        </Button>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (!canAddMore) {
            toast.error(`You can add up to ${MAX_ITEMS_PER_USER} items`)
            return
          }
          setShowAddDialog(true)
        }}
        className={cn(
          'absolute bottom-16 left-1/2 z-10 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm font-medium text-white shadow-lg transition-shadow hover:shadow-xl',
          canAddMore ? 'bg-primary' : 'bg-muted-foreground'
        )}
      >
        <Plus className="h-5 w-5" />
        {canAddMore
          ? `Add to Board (${ownItemCount}/${MAX_ITEMS_PER_USER})`
          : `Limit Reached (${MAX_ITEMS_PER_USER}/${MAX_ITEMS_PER_USER})`
        }
      </motion.button>

      <AddItemDialog
        open={showAddDialog}
        onClose={() => { setShowAddDialog(false); setAddType(null) }}
        addType={addType}
        setAddType={setAddType}
        onAdded={(item) => {
          setItems((prev) => [...prev, item])
          setShowAddDialog(false)
          setAddType(null)
        }}
      />
    </div>
  )
}

function MemberBadge({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
        style={{ backgroundColor: member?.avatar_color || '#4BA3E3' }}
      >
        {member?.first_name?.[0]}{member?.last_name?.[0]}
      </div>
      <span className="text-[10px] text-gray-600">{member?.first_name}</span>
    </div>
  )
}

function BoardItem({
  item, boardWidth, boardHeight, isOwn, isDragging, onDragStart, onDelete,
}: {
  item: VisionBoardItem
  boardWidth: number
  boardHeight: number
  isOwn: boolean
  isDragging: boolean
  onDragStart: (e: React.PointerEvent) => void
  onDelete: () => void
}) {
  const member = item.member as Member
  const x = item.x * boardWidth
  const y = item.y * boardHeight

  const wrapperStyle: React.CSSProperties = {
    left: x,
    top: y,
    transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${isDragging ? 1.05 : 1})`,
    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
  }

  const deleteBtn = isOwn && (
    <button
      onClick={(e) => { e.stopPropagation(); onDelete() }}
      className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-muted-foreground shadow-md transition-colors hover:bg-red-50 hover:text-red-500"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  )

  const dragHandle = isOwn && (
    <div className="mb-0.5 flex justify-end px-1">
      <GripVertical className="h-3.5 w-3.5 text-gray-300" />
    </div>
  )

  if (item.type === 'sticker') {
    return (
      <div
        data-board-item
        className={cn('absolute select-none', isDragging && 'z-50', isOwn && 'cursor-grab active:cursor-grabbing')}
        style={{ ...wrapperStyle, width: 120 }}
        onPointerDown={isOwn ? onDragStart : undefined}
      >
        <div className="relative">
          {deleteBtn}
          <div className={cn(
            'flex flex-col items-center rounded-2xl bg-white/80 p-3 shadow-md backdrop-blur-sm',
            isOwn && 'ring-2 ring-primary/20',
            isDragging && 'shadow-xl ring-primary/40',
          )}>
            <span className="text-6xl leading-none" style={{ pointerEvents: 'none' }}>
              {item.content}
            </span>
            <div className="mt-2">
              <MemberBadge member={member} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (item.type === 'wish') {
    const theme = WISH_THEMES.find((t) => t.id === item.color) || WISH_THEMES[0]
    return (
      <div
        data-board-item
        className={cn('absolute select-none', isDragging && 'z-50', isOwn && 'cursor-grab active:cursor-grabbing')}
        style={{ ...wrapperStyle, width: 220 }}
        onPointerDown={isOwn ? onDragStart : undefined}
      >
        <div className="relative">
          {deleteBtn}
          <div className={cn(
            'overflow-hidden rounded-xl border shadow-md',
            theme.border,
            isOwn && 'ring-2 ring-primary/20',
            isDragging && 'shadow-xl ring-primary/40',
          )}>
            <div className={cn('bg-gradient-to-r px-4 py-2', theme.bg)}>
              <div className="flex items-center gap-1.5">
                <Star className={cn('h-3.5 w-3.5', theme.accent)} fill="currentColor" />
                <span className={cn('text-xs font-semibold', theme.accent)}>A Wish for Luca</span>
              </div>
            </div>
            <div className={cn('bg-gradient-to-b px-4 py-3', theme.bg)}>
              <p
                className="text-sm leading-relaxed text-gray-700"
                style={{ fontFamily: "'Caveat', cursive, sans-serif", pointerEvents: 'none' }}
              >
                {item.content}
              </p>
              <div className="mt-2 border-t border-black/5 pt-2">
                <MemberBadge member={member} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (item.type === 'doodle') {
    return (
      <div
        data-board-item
        className={cn('absolute select-none', isDragging && 'z-50', isOwn && 'cursor-grab active:cursor-grabbing')}
        style={{ ...wrapperStyle, width: 200 }}
        onPointerDown={isOwn ? onDragStart : undefined}
      >
        <div className="relative">
          {deleteBtn}
          <div className={cn(
            'rounded-xl bg-white p-2 shadow-md',
            isOwn && 'ring-2 ring-primary/20',
            isDragging && 'shadow-xl ring-primary/40',
          )}>
            {dragHandle}
            <div className="overflow-hidden rounded-lg bg-gray-50" style={{ pointerEvents: 'none' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.content}
                alt="Doodle"
                className="h-40 w-full object-contain"
                draggable={false}
              />
            </div>
            <div className="mt-1.5 px-1">
              <MemberBadge member={member} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (item.type === 'star') {
    return (
      <div
        data-board-item
        className={cn('absolute select-none', isDragging && 'z-50', isOwn && 'cursor-grab active:cursor-grabbing')}
        style={{ ...wrapperStyle, width: 200 }}
        onPointerDown={isOwn ? onDragStart : undefined}
      >
        <div className="relative">
          {deleteBtn}
          <div className={cn(
            'rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 p-4 shadow-md ring-1 ring-amber-200/50',
            isOwn && 'ring-2 ring-primary/20',
            isDragging && 'shadow-xl ring-primary/40',
          )}>
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Prediction</span>
            </div>
            <p
              className="text-sm leading-relaxed text-gray-700"
              style={{ fontFamily: "'Caveat', cursive, sans-serif", pointerEvents: 'none' }}
            >
              {item.content}
            </p>
            <div className="mt-2 border-t border-amber-200/50 pt-2">
              <MemberBadge member={member} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (item.type === 'note') {
    return (
      <div
        data-board-item
        className={cn('absolute select-none', isDragging && 'z-50', isOwn && 'cursor-grab active:cursor-grabbing')}
        style={{ ...wrapperStyle, width: 200 }}
        onPointerDown={isOwn ? onDragStart : undefined}
      >
        <div className="relative">
          {deleteBtn}
          <div
            className={cn(
              'rounded-lg p-4 shadow-md',
              isOwn && 'ring-2 ring-primary/20',
              isDragging && 'shadow-xl ring-primary/40',
            )}
            style={{ backgroundColor: item.color }}
          >
            {dragHandle}
            <p
              className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
              style={{ fontFamily: "'Caveat', cursive, sans-serif", pointerEvents: 'none' }}
            >
              {item.content}
            </p>
            <div className="mt-2 border-t border-black/5 pt-2">
              <MemberBadge member={member} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Photo (default)
  return (
    <div
      data-board-item
      className={cn('absolute select-none', isDragging && 'z-50', isOwn && 'cursor-grab active:cursor-grabbing')}
      style={wrapperStyle}
      onPointerDown={isOwn ? onDragStart : undefined}
    >
      <div className="relative">
        {deleteBtn}
        <div
          className={cn(
            'rounded-lg bg-white p-2 shadow-md',
            isOwn && 'ring-2 ring-primary/20',
            isDragging && 'shadow-xl ring-primary/40',
          )}
          style={{ width: 200 }}
        >
          {dragHandle}
          <div className="overflow-hidden rounded" style={{ pointerEvents: 'none' }}>
            <Image
              src={item.content}
              alt={`${member?.first_name}'s photo`}
              width={200}
              height={200}
              className="h-44 w-full object-cover"
              draggable={false}
            />
          </div>
          <div className="mt-1.5 px-1">
            <MemberBadge member={member} />
          </div>
        </div>
      </div>
    </div>
  )
}

function DoodleCanvas({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushColor, setBrushColor] = useState('#333333')
  const [brushSize, setBrushSize] = useState(3)
  const lastPosRef = useRef({ x: 0, y: 0 })

  const colors = ['#333333', '#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDraw = (e: React.PointerEvent) => {
    setIsDrawing(true)
    lastPosRef.current = getPos(e)
  }

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = brushColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPosRef.current = pos
  }

  const endDraw = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className="h-48 w-full cursor-crosshair touch-none"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Color:</span>
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setBrushColor(c)}
            className={cn(
              'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
              brushColor === c ? 'border-primary scale-110' : 'border-transparent'
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Size:</span>
        <input
          type="range"
          min={1}
          max={12}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="flex-1"
        />
        <button onClick={clearCanvas} className="text-xs text-muted-foreground hover:text-foreground">
          Clear
        </button>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleSave}>
          Add Doodle
        </Button>
      </div>
    </div>
  )
}

function AddItemDialog({
  open, onClose, addType, setAddType, onAdded,
}: {
  open: boolean
  onClose: () => void
  addType: AddItemType
  setAddType: (t: AddItemType) => void
  onAdded: (item: VisionBoardItem) => void
}) {
  const [noteText, setNoteText] = useState('')
  const [noteColor, setNoteColor] = useState<string>(STICKY_NOTE_COLORS[0])
  const [wishText, setWishText] = useState('')
  const [wishTheme, setWishTheme] = useState(WISH_THEMES[0].id)
  const [starText, setStarText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setNoteText('')
    setNoteColor(STICKY_NOTE_COLORS[0])
    setWishText('')
    setWishTheme(WISH_THEMES[0].id)
    setStarText('')
  }

  const submitItem = async (type: string, content: string, color?: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/vision-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content,
          color: color || undefined,
          x: 0.3 + Math.random() * 0.4,
          y: 0.3 + Math.random() * 0.4,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      onAdded(data.item)
      resetState()
      toast.success('Added to the board!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setIsSubmitting(false)
    }
  }

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

      const { url } = await uploadFile(fileToUpload, file.name)
      await submitItem('photo', url)
    } catch {
      toast.error('Failed to add photo')
      setIsSubmitting(false)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const typeOptions = [
    { id: 'photo' as const, label: 'Photo', icon: ImageIcon, color: 'text-primary', hoverBg: 'hover:bg-primary/5', hoverBorder: 'hover:border-primary' },
    { id: 'note' as const, label: 'Sticky Note', icon: StickyNote, color: 'text-amber-500', hoverBg: 'hover:bg-amber-50', hoverBorder: 'hover:border-amber-400' },
    { id: 'sticker' as const, label: 'Sticker', icon: Smile, color: 'text-pink-500', hoverBg: 'hover:bg-pink-50', hoverBorder: 'hover:border-pink-400' },
    { id: 'wish' as const, label: 'Wish Card', icon: Heart, color: 'text-indigo-500', hoverBg: 'hover:bg-indigo-50', hoverBorder: 'hover:border-indigo-400' },
    { id: 'doodle' as const, label: 'Doodle', icon: Pencil, color: 'text-green-500', hoverBg: 'hover:bg-green-50', hoverBorder: 'hover:border-green-400' },
    { id: 'star' as const, label: 'Prediction', icon: Star, color: 'text-amber-500', hoverBg: 'hover:bg-amber-50', hoverBorder: 'hover:border-amber-400' },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetState() } }}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto" aria-describedby="vision-board-dialog-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {"Add to Luca's Notes"}
          </DialogTitle>
          <DialogDescription id="vision-board-dialog-desc">
            Pick something fun to add to the board
          </DialogDescription>
        </DialogHeader>

        {!addType ? (
          <div className="grid grid-cols-3 gap-2 pt-2">
            {typeOptions.map(({ id, label, icon: Icon, color, hoverBg, hoverBorder }) => (
              <button
                key={id}
                onClick={() => setAddType(id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-border p-4 transition-colors',
                  hoverBorder, hoverBg
                )}
              >
                <Icon className={cn('h-7 w-7', color)} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        ) : addType === 'photo' ? (
          <div className="space-y-4 pt-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isSubmitting}
              className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 transition-colors hover:border-primary/50"
            >
              {isSubmitting ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <ImageIcon className="h-8 w-8 text-primary" />}
              <span className="text-sm text-muted-foreground">{isSubmitting ? 'Uploading...' : 'Tap to choose a photo'}</span>
            </button>
            <Button variant="ghost" className="w-full" onClick={() => setAddType(null)}>
              <X className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        ) : addType === 'note' ? (
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
            <div className="flex flex-wrap items-center gap-2">
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
              <Button variant="ghost" className="flex-1" onClick={() => setAddType(null)}>Back</Button>
              <Button className="flex-1" onClick={() => submitItem('note', noteText.trim(), noteColor)} disabled={!noteText.trim() || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Note'}
              </Button>
            </div>
          </div>
        ) : addType === 'sticker' ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Pick a sticker for Luca:</p>
            <div className="grid grid-cols-6 gap-2">
              {BOARD_STICKERS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => submitItem('sticker', emoji)}
                  disabled={isSubmitting}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform hover:scale-125 hover:bg-gray-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setAddType(null)}>
              <X className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        ) : addType === 'wish' ? (
          <div className="space-y-4 pt-2">
            <Textarea
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              placeholder="Write a wish for Luca..."
              rows={4}
              maxLength={300}
              className="resize-none rounded-xl"
            />
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Card theme:</span>
              <div className="flex gap-2">
                {WISH_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setWishTheme(theme.id)}
                    className={cn(
                      'flex-1 rounded-lg border-2 bg-gradient-to-r px-3 py-2 text-xs font-medium transition-all',
                      theme.bg, theme.border,
                      wishTheme === theme.id ? 'scale-105 shadow-md' : 'opacity-60 hover:opacity-100'
                    )}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setAddType(null)}>Back</Button>
              <Button className="flex-1" onClick={() => submitItem('wish', wishText.trim(), wishTheme)} disabled={!wishText.trim() || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Wish'}
              </Button>
            </div>
          </div>
        ) : addType === 'doodle' ? (
          <div className="space-y-2 pt-2">
            <DoodleCanvas onSave={(dataUrl) => submitItem('doodle', dataUrl)} />
            <Button variant="ghost" className="w-full" onClick={() => setAddType(null)}>
              <X className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        ) : addType === 'star' ? (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap gap-1.5">
              {STAR_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setStarText(prompt + ' ')}
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:bg-amber-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <Textarea
              value={starText}
              onChange={(e) => setStarText(e.target.value)}
              placeholder="Make a fun prediction about Luca..."
              rows={3}
              maxLength={300}
              className="resize-none rounded-xl"
            />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setAddType(null)}>Back</Button>
              <Button className="flex-1" onClick={() => submitItem('star', starText.trim())} disabled={!starText.trim() || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Prediction'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

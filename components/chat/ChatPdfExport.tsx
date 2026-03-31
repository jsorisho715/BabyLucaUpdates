'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import type { Message, Member, BabyStats } from '@/lib/types'
import { format, isValid } from 'date-fns'

interface ChatPdfExportProps {
  messages: Message[]
}

// Brand palette derived from globals.css HSL variables
// --primary: 201 79% 56% → rgb(54, 169, 231)
const B = {
  primary:     [54, 169, 231] as [number, number, number],
  primaryMid:  [148, 188, 209] as [number, number, number],
  primaryLight:[206, 230, 243] as [number, number, number],
  dark:        [25, 45, 60] as [number, number, number],
  body:        [45, 65, 80] as [number, number, number],
  muted:       [120, 150, 165] as [number, number, number],
  subtle:      [185, 210, 225] as [number, number, number],
  white:       [255, 255, 255] as [number, number, number],
  nearWhite:   [247, 250, 253] as [number, number, number],
}

async function loadImageForPdf(
  url: string,
): Promise<{ dataUrl: string; naturalWidth: number; naturalHeight: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const w = img.naturalWidth
        const h = img.naturalHeight
        const canvas = document.createElement('canvas')
        // Resize to max 1600×1200 for reasonable PDF file size
        const scale = Math.min(1, 1600 / w, 1200 / h)
        canvas.width = Math.round(w * scale)
        canvas.height = Math.round(h * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.88), naturalWidth: w, naturalHeight: h })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setFill(doc: any, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2])
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setDraw(doc: any, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2])
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setTxt(doc: any, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawPageFooter(doc: any, pageWidth: number, pageHeight: number) {
  setTxt(doc, B.subtle)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.text("Made with love \u2665  \u2014  Luca\u2019s Updates", pageWidth / 2, pageHeight - 5.5, { align: 'center' })
}

export function ChatPdfExport({ messages }: ChatPdfExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const [{ default: jsPDF }] = await Promise.all([import('jspdf')])

      // Fetch baby stats for the cover page
      let babyStats: BabyStats | null = null
      try {
        const r = await fetch('/api/baby-stats')
        if (r.ok) babyStats = await r.json()
      } catch { /* non-critical */ }

      // Pre-load all images before building the PDF
      const imageCache: Record<string, { dataUrl: string; naturalWidth: number; naturalHeight: number } | null> = {}
      await Promise.all(
        messages.flatMap((m) =>
          (m.media ?? [])
            .filter((med) => med.type === 'image')
            .map(async (med) => {
              imageCache[med.url] = await loadImageForPdf(med.url)
            })
        )
      )

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const PW = doc.internal.pageSize.getWidth()   // 210mm
      const PH = doc.internal.pageSize.getHeight()  // 297mm
      const M = 16   // margin
      const CW = PW - M * 2  // content width ~178mm
      let y = 0

      const checkY = (needed: number) => {
        if (y + needed > PH - M - 10) {
          drawPageFooter(doc, PW, PH)
          doc.addPage()
          // Thin brand stripe at top of every content page
          setFill(doc, B.primary)
          doc.rect(0, 0, PW, 1.5, 'F')
          y = M + 8
        }
      }

      // ── COVER PAGE ────────────────────────────────────────────────────────────
      // Sky-blue header band
      setFill(doc, B.primary)
      doc.rect(0, 0, PW, 68, 'F')

      // Decorative soft circles in header
      setFill(doc, B.primaryMid)
      doc.circle(PW + 5, -5, 42, 'F')
      setFill(doc, B.primaryLight)
      doc.circle(-8, 60, 28, 'F')

      // App title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(30)
      setTxt(doc, B.white)
      const babyName = babyStats?.name?.trim() || 'Luca'
      doc.text(`${babyName}\u2019s Updates`, PW / 2, 30, { align: 'center' })

      // Subtitle
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.setTextColor(210, 238, 252)
      doc.text('A Memory Book', PW / 2, 42, { align: 'center' })

      // Small heart row
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      doc.text('\u2665   \u2665   \u2665', PW / 2, 55, { align: 'center' })

      // White content area (rest of page)
      setFill(doc, B.nearWhite)
      doc.rect(0, 68, PW, PH - 68, 'F')

      let cy = 84

      // Birth stats block
      if (babyStats?.birth_date) {
        const bd = new Date(babyStats.birth_date)
        if (isValid(bd)) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          setTxt(doc, B.primaryMid)
          doc.text('B O R N', PW / 2, cy, { align: 'center' })
          cy += 7

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(22)
          setTxt(doc, B.dark)
          doc.text(format(bd, 'MMMM d, yyyy'), PW / 2, cy, { align: 'center' })
          cy += 8

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(12)
          setTxt(doc, B.muted)
          doc.text(format(bd, 'h:mm a'), PW / 2, cy, { align: 'center' })
          cy += 10
        }
      }

      // Weight / length stats
      const statParts: string[] = []
      if (babyStats?.weight_lbs != null) {
        const oz = babyStats.weight_oz ?? 0
        statParts.push(`${babyStats.weight_lbs} lbs ${oz} oz`)
      }
      if (babyStats?.length_inches != null) {
        statParts.push(`${babyStats.length_inches}"`)
      }
      if (statParts.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        setTxt(doc, B.primary)
        doc.text(statParts.join('   \u00b7   '), PW / 2, cy, { align: 'center' })
        cy += 10
      }

      // Notes / caption
      if (babyStats?.notes?.trim()) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10.5)
        setTxt(doc, B.muted)
        const noteLines = doc.splitTextToSize(`\u201c${babyStats.notes.trim()}\u201d`, CW - 16)
        noteLines.forEach((line: string) => {
          doc.text(line, PW / 2, cy, { align: 'center' })
          cy += 6
        })
        cy += 4
      }

      // Decorative divider
      setDraw(doc, B.primaryLight)
      doc.setLineWidth(0.6)
      doc.line(PW / 2 - 28, cy, PW / 2 + 28, cy)
      cy += 10

      // Stats row: message count + date range
      const nonSystem = messages.filter((m) => m.type !== 'system' && (m.content || (m.media && m.media.length > 0)))
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      setTxt(doc, B.muted)
      doc.text(`${nonSystem.length} messages shared with love`, PW / 2, cy, { align: 'center' })
      cy += 6

      if (nonSystem.length > 0) {
        const first = new Date(nonSystem[0].created_at)
        const last = new Date(nonSystem[nonSystem.length - 1].created_at)
        if (isValid(first) && isValid(last)) {
          const sameDay = format(first, 'yyyyMMdd') === format(last, 'yyyyMMdd')
          const range = sameDay
            ? format(first, 'MMMM d, yyyy')
            : `${format(first, 'MMM d')} \u2013 ${format(last, 'MMM d, yyyy')}`
          doc.text(range, PW / 2, cy, { align: 'center' })
        }
      }

      // Cover page footer
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      setTxt(doc, B.subtle)
      doc.text(`Exported ${format(new Date(), 'MMMM d, yyyy')}`, PW / 2, PH - 14, { align: 'center' })
      setTxt(doc, B.primary)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(14)
      doc.text('\u2665', PW / 2, PH - 7, { align: 'center' })

      // ── TRANSCRIPT PAGES ──────────────────────────────────────────────────────
      doc.addPage()
      setFill(doc, B.primary)
      doc.rect(0, 0, PW, 1.5, 'F')
      y = M + 8

      // Chapter heading
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      setTxt(doc, B.primary)
      doc.text('Chat Transcript', M, y)
      y += 6
      setDraw(doc, B.primaryLight)
      doc.setLineWidth(0.3)
      doc.line(M, y, PW - M, y)
      y += 7

      let lastDateStr = ''

      for (const msg of messages) {
        const hasContent = msg.content || (msg.media && msg.media.length > 0)
        if (!hasContent) continue

        const createdDate = new Date(msg.created_at)
        const dateStr = isValid(createdDate) ? format(createdDate, 'MMMM d, yyyy') : ''
        const timeStr = isValid(createdDate) ? format(createdDate, 'h:mm a') : ''
        const member = msg.member as Member | undefined
        const senderName = member
          ? `${member.first_name} ${member.last_name}`.trim()
          : 'Unknown'
        const isAdmin = member?.is_admin ?? false

        // ── Date separator
        if (dateStr && dateStr !== lastDateStr) {
          checkY(12)
          y += 2
          const mid = PW / 2
          setDraw(doc, B.subtle)
          doc.setLineWidth(0.25)
          doc.line(M, y, mid - 24, y)
          doc.line(mid + 24, y, PW - M, y)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.5)
          setTxt(doc, B.muted)
          doc.text(dateStr.toUpperCase(), mid, y + 1, { align: 'center' })
          y += 8
          lastDateStr = dateStr
        }

        // ── System message
        if (msg.type === 'system') {
          checkY(7)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8)
          setTxt(doc, B.subtle)
          const slines = doc.splitTextToSize(msg.content || '', CW - 20)
          for (const line of slines) {
            checkY(5)
            doc.text(line, PW / 2, y, { align: 'center' })
            y += 4.5
          }
          y += 2
          continue
        }

        // ── Avatar color dot
        const avatarHex = member?.avatar_color?.replace('#', '')
        if (avatarHex && avatarHex.length === 6) {
          doc.setFillColor(
            parseInt(avatarHex.substring(0, 2), 16),
            parseInt(avatarHex.substring(2, 4), 16),
            parseInt(avatarHex.substring(4, 6), 16),
          )
          doc.circle(M + 1.8, y + 0.5, 2, 'F')
        }

        // ── Sender name + optional "Parent" label
        checkY(8)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        setTxt(doc, isAdmin ? B.primary : B.dark)
        doc.text(senderName, M + 6, y)

        if (isAdmin) {
          const nameW = doc.getTextWidth(senderName)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(6.5)
          setTxt(doc, B.primaryMid)
          doc.text('PARENT', M + 6 + nameW + 2.5, y - 0.5)
        }

        // Time right-aligned
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        setTxt(doc, B.subtle)
        doc.text(timeStr, PW - M, y, { align: 'right' })
        y += 5.5

        // ── Text content
        if (msg.content) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          setTxt(doc, B.body)
          const tlines = doc.splitTextToSize(msg.content, CW - 6)
          for (const line of tlines) {
            checkY(5.5)
            doc.text(line, M + 4, y)
            y += 5.5
          }
        }

        // ── Media
        if (msg.media && msg.media.length > 0) {
          for (const med of msg.media) {
            if (med.type === 'image') {
              const cached = imageCache[med.url]
              if (cached) {
                // Calculate display dimensions in mm (keeping aspect ratio, max 150mm × 90mm)
                const aspect = cached.naturalWidth / cached.naturalHeight
                let imgW = Math.min(CW - 4, 150)
                let imgH = imgW / aspect
                if (imgH > 90) { imgH = 90; imgW = imgH * aspect }

                checkY(imgH + 6)
                // Subtle background frame
                setFill(doc, B.primaryLight)
                doc.roundedRect(M + 2, y, imgW + 2, imgH + 2, 2, 2, 'F')
                try {
                  doc.addImage(cached.dataUrl, 'JPEG', M + 3, y + 1, imgW, imgH)
                } catch {
                  doc.setFont('helvetica', 'italic')
                  doc.setFontSize(9)
                  setTxt(doc, B.primary)
                  doc.text('\uD83D\uDCF7  Photo', M + (CW - 4) / 2, y + imgH / 2, { align: 'center' })
                }
                y += imgH + 6
              } else {
                // Could not load — branded placeholder
                checkY(18)
                setFill(doc, B.primaryLight)
                doc.roundedRect(M + 2, y, CW - 4, 15, 2, 2, 'F')
                doc.setFont('helvetica', 'italic')
                doc.setFontSize(9)
                setTxt(doc, B.primaryMid)
                doc.text('\uD83D\uDCF7  Photo', M + (CW - 4) / 2, y + 9, { align: 'center' })
                y += 18
              }
            } else if (med.type === 'video') {
              checkY(16)
              setFill(doc, B.primaryLight)
              doc.roundedRect(M + 2, y, CW - 4, 13, 2, 2, 'F')
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(9)
              setTxt(doc, B.primaryMid)
              doc.text('\uD83C\uDFA5  Video clip', M + (CW - 4) / 2, y + 8, { align: 'center' })
              y += 16
            } else if (med.type === 'audio') {
              checkY(15)
              setFill(doc, B.primaryLight)
              doc.roundedRect(M + 2, y, CW - 4, 12, 2, 2, 'F')
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(9)
              setTxt(doc, B.primaryMid)
              doc.text('\uD83C\uDF99  Voice message', M + (CW - 4) / 2, y + 7, { align: 'center' })
              y += 15
            }
          }
        }

        // ── Reactions
        if (msg.reactions && msg.reactions.length > 0) {
          checkY(6)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          setTxt(doc, B.muted)
          const rxStr = msg.reactions.map((r) => `${r.emoji} ${r.count}`).join('  ')
          doc.text(rxStr, M + 4, y)
          y += 5.5
        }

        y += 4.5
      }

      // Footer on final page
      drawPageFooter(doc, PW, PH)

      // Page numbers on all pages except cover
      const totalPages = doc.getNumberOfPages()
      for (let p = 2; p <= totalPages; p++) {
        doc.setPage(p)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        setTxt(doc, B.subtle)
        doc.text(`${p - 1} / ${totalPages - 1}`, PW - M, PH - 5.5, { align: 'right' })
      }

      const safeName = babyName.toLowerCase().replace(/\s+/g, '-')
      doc.save(`${safeName}-updates-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } catch (err) {
      console.error('PDF export failed', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleExport}
      disabled={isExporting}
      title="Export chat as PDF memory book"
      className="h-9 w-9 text-muted-foreground"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
    </Button>
  )
}

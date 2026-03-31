'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import type { Message, Member } from '@/lib/types'
import { format, isValid } from 'date-fns'

interface ChatPdfExportProps {
  messages: Message[]
}

export function ChatPdfExport({ messages }: ChatPdfExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Dynamic import to keep bundle small
      const [{ default: jsPDF }] = await Promise.all([
        import('jspdf'),
      ])

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - margin * 2
      let y = margin

      const addPage = () => {
        doc.addPage()
        y = margin
      }

      const checkY = (needed: number) => {
        if (y + needed > pageHeight - margin) addPage()
      }

      // Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(80, 70, 180)
      doc.text("Luca's Updates — Chat Memory", pageWidth / 2, y, { align: 'center' })
      y += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(130, 130, 130)
      doc.text(`Exported on ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, y, { align: 'center' })
      y += 4

      // Divider
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6

      // Group messages to detect date breaks
      let lastDateStr = ''

      const textMessages = messages.filter((m) => m.type !== 'system' || m.content)

      for (const msg of textMessages) {
        const createdDate = new Date(msg.created_at)
        const dateStr = isValid(createdDate) ? format(createdDate, 'MMMM d, yyyy') : ''
        const timeStr = isValid(createdDate) ? format(createdDate, 'h:mm a') : ''
        const member = msg.member as Member | undefined
        const senderName = member
          ? `${member.first_name} ${member.last_name}`.trim()
          : 'Unknown'

        // Date separator
        if (dateStr && dateStr !== lastDateStr) {
          checkY(12)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(150, 150, 150)
          const dateLabel = `— ${dateStr} —`
          doc.text(dateLabel, pageWidth / 2, y, { align: 'center' })
          y += 6
          lastDateStr = dateStr
        }

        if (msg.type === 'system') {
          // System message (join, etc.)
          checkY(8)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(9)
          doc.setTextColor(160, 160, 160)
          const lines = doc.splitTextToSize(msg.content || '', contentWidth)
          for (const line of lines) {
            checkY(5)
            doc.text(line, pageWidth / 2, y, { align: 'center' })
            y += 5
          }
          y += 2
          continue
        }

        // Sender name + time
        checkY(8)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(60, 60, 60)
        doc.text(senderName, margin, y)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(160, 160, 160)
        doc.text(timeStr, pageWidth - margin, y, { align: 'right' })
        y += 5

        // Message content
        if (msg.content) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.setTextColor(40, 40, 40)
          const lines = doc.splitTextToSize(msg.content, contentWidth)
          for (const line of lines) {
            checkY(5)
            doc.text(line, margin, y)
            y += 5
          }
        }

        // Media placeholder
        if (msg.type === 'image') {
          checkY(6)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(9)
          doc.setTextColor(120, 120, 200)
          doc.text('📷 [Photo]', margin, y)
          y += 5
        } else if (msg.type === 'video') {
          checkY(6)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(9)
          doc.setTextColor(120, 120, 200)
          doc.text('🎥 [Video]', margin, y)
          y += 5
        } else if (msg.type === 'audio') {
          checkY(6)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(9)
          doc.setTextColor(120, 120, 200)
          doc.text('🎙️ [Voice message]', margin, y)
          y += 5
        }

        // Reactions
        if (msg.reactions && msg.reactions.length > 0) {
          checkY(5)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(130, 130, 130)
          const reactionStr = msg.reactions
            .map((r) => `${r.emoji} ${r.count}`)
            .join('  ')
          doc.text(reactionStr, margin, y)
          y += 5
        }

        y += 3 // spacing between messages
      }

      // Footer on last page
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(180, 180, 180)
      doc.text("Made with love ❤️  — Luca's Updates", pageWidth / 2, pageHeight - 8, { align: 'center' })

      doc.save(`lucas-updates-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
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
      title="Export chat as PDF"
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

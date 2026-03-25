'use client'

import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/lib/upload'
import type { Message, Member } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Send, Image as ImageIcon, X, PartyPopper, Loader2,
} from 'lucide-react'
import { MentionAutocomplete } from './MentionAutocomplete'
import { VoiceRecorder } from './VoiceRecorder'

interface MessageComposerProps {
  onSend: (data: {
    content?: string
    type: 'text' | 'image' | 'video' | 'audio'
    replyToId?: string | null
    mediaUrls?: { url: string; type: 'image' | 'video' | 'audio'; sizeBytes?: number }[]
    mentions?: string[]
  }) => Promise<void>
  replyTo: Message | null
  onCancelReply: () => void
  onCelebrate: () => void
  members: Member[]
  currentMemberId: string
}

export function MessageComposer({
  onSend,
  replyTo,
  onCancelReply,
  onCelebrate,
  members,
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed && !isUploading) return
    if (isSending) return

    setIsSending(true)
    try {
      const mentionedMembers = members
        .filter((m) => trimmed.includes(`@${m.first_name}`))
        .map((m) => m.id)

      await onSend({
        content: trimmed,
        type: 'text',
        replyToId: replyTo?.id || null,
        mentions: mentionedMembers.length > 0 ? mentionedMembers : undefined,
      })

      setContent('')
      onCancelReply()
      textareaRef.current?.focus()
    } catch {
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }, [content, isSending, isUploading, members, onSend, replyTo, onCancelReply])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    const cursorPos = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = value.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setShowMentions(true)
      setMentionQuery(mentionMatch[1])
    } else {
      setShowMentions(false)
    }
  }

  const handleMentionSelect = (member: Member) => {
    const cursorPos = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = content.slice(0, cursorPos)
    const textAfterCursor = content.slice(cursorPos)
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '')
    const newContent = `${beforeMention}@${member.first_name} ${textAfterCursor}`

    setContent(newContent)
    setShowMentions(false)

    setTimeout(() => {
      const newPos = beforeMention.length + member.first_name.length + 2
      textareaRef.current?.setSelectionRange(newPos, newPos)
      textareaRef.current?.focus()
    }, 0)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const uploadedMedia: { url: string; type: 'image' | 'video' | 'audio'; sizeBytes?: number }[] = []

    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/')
        let fileToUpload: File | Blob = file

        if (!isVideo && file.size > 2 * 1024 * 1024) {
          setUploadProgress('Compressing image...')
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 2,
            maxWidthOrHeight: 2400,
            useWebWorker: true,
          })
        }

        setUploadProgress(isVideo ? 'Uploading video...' : 'Uploading image...')

        const result = await uploadFile(fileToUpload, file.name)
        uploadedMedia.push(result)
      }

      await onSend({
        content: content.trim() || undefined,
        type: uploadedMedia[0].type as 'image' | 'video',
        replyToId: replyTo?.id || null,
        mediaUrls: uploadedMedia,
      })

      setContent('')
      onCancelReply()
      toast.success('Media uploaded!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="border-t bg-white/80 backdrop-blur-sm">
      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
              <div className="h-full w-0.5 shrink-0 self-stretch rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-primary">
                  Replying to {(replyTo.member as Member)?.first_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {replyTo.content || '📷 Photo'}
                </p>
              </div>
              <button
                onClick={onCancelReply}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 border-b px-4 py-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {uploadProgress}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mention autocomplete */}
      <AnimatePresence>
        {showMentions && (
          <MentionAutocomplete
            query={mentionQuery}
            members={members}
            onSelect={handleMentionSelect}
            onClose={() => setShowMentions(false)}
          />
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="flex items-end gap-1.5 p-3">
        <div className="flex gap-0.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <VoiceRecorder onSend={onSend} />
        </div>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className={cn(
            'max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-2xl border-border/50 bg-muted/50 px-4 py-2.5 text-sm',
            'focus-visible:ring-1 focus-visible:ring-primary/30'
          )}
        />

        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-amber-500 hover:text-amber-600"
            onClick={onCelebrate}
            title="Send celebration!"
          >
            <PartyPopper className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={handleSend}
            disabled={(!content.trim() && !isUploading) || isSending}
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

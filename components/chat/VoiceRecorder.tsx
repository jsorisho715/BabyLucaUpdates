'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/lib/upload'

interface VoiceRecorderProps {
  onSend: (data: {
    content?: string
    type: 'audio'
    mediaUrls: { url: string; type: 'audio'; sizeBytes?: number }[]
  }) => Promise<void>
}

export function VoiceRecorder({ onSend }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        toast.error('Voice recording is not supported on this device')
        return
      }

      const permState = await navigator.permissions?.query({ name: 'microphone' as PermissionName }).catch(() => null)
      if (permState?.state === 'denied') {
        toast.error('Microphone access is blocked. Please enable it in your browser settings.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      cancelledRef.current = false

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        if (cancelledRef.current) {
          cancelledRef.current = false
          return
        }

        const blob = new Blob(chunksRef.current, { type: mimeType })

        if (blob.size < 1000) {
          toast.error('Recording too short -- hold for at least 1 second')
          return
        }

        setIsUploading(true)
        try {
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
          const result = await uploadFile(blob, `voice-${Date.now()}.${ext}`)

          await onSend({
            type: 'audio',
            mediaUrls: [{ url: result.url, type: 'audio', sizeBytes: blob.size }],
          })
        } catch {
          toast.error('Failed to send voice note')
        } finally {
          setIsUploading(false)
        }
      }

      recorder.start(250)
      setIsRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access and try again.')
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        toast.error('No microphone found on this device.')
      } else {
        toast.error('Could not start recording')
      }
    }
  }, [onSend])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)
  }, [])

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    chunksRef.current = []
    setIsRecording(false)
    setDuration(0)
  }, [])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (isUploading) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </Button>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <button
              onClick={cancelRecording}
              className="rounded-full p-1 text-muted-foreground hover:text-destructive"
              aria-label="Cancel recording"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-red-500"
              />
              <span className="min-w-[2.5rem] text-xs font-medium tabular-nums text-foreground">
                {formatTime(duration)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-9 w-9 shrink-0',
          isRecording
            ? 'text-red-500 hover:text-red-600'
            : 'text-muted-foreground'
        )}
        onClick={isRecording ? stopRecording : startRecording}
        aria-label={isRecording ? 'Stop recording' : 'Record voice note'}
      >
        {isRecording ? (
          <Square className="h-4 w-4 fill-current" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
    </>
  )
}

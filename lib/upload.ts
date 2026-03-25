'use client'

import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  url: string
  type: 'image' | 'video' | 'audio'
  sizeBytes: number
}

export async function uploadFile(file: File | Blob, fileName?: string): Promise<UploadResult> {
  const supabase = createClient()
  const actualName = fileName || (file instanceof File ? file.name : `file-${Date.now()}`)
  const fileType = file.type.split(';')[0].trim()

  const isVideo = fileType.startsWith('video/')
  const isAudio = fileType.startsWith('audio/')
  const ext = actualName.split('.').pop() || (isAudio ? 'webm' : isVideo ? 'mp4' : 'jpg')
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const storagePath = `uploads/${timestamp}-${randomId}.${ext}`

  const { error } = await supabase.storage
    .from('media')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('Direct upload error:', error)
    throw new Error(error.message || 'Upload failed')
  }

  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(storagePath)

  return {
    url: publicUrl,
    type: isAudio ? 'audio' : isVideo ? 'video' : 'image',
    sizeBytes: file.size,
  }
}

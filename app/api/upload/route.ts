import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      )
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp',
      'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported' },
        { status: 400 }
      )
    }

    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')
    const ext = file.name.split('.').pop() || (isAudio ? 'webm' : isVideo ? 'mp4' : 'jpg')
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const fileName = `${session.memberId}/${timestamp}-${randomId}.${ext}`

    const supabase = createAdminClient()

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(fileName)

    return NextResponse.json({
      url: publicUrl,
      type: isAudio ? 'audio' : isVideo ? 'video' : 'image',
      sizeBytes: file.size,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Something went wrong during upload' },
      { status: 500 }
    )
  }
}

import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const pinSchema = z.object({
  messageId: z.string().uuid(),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: 'Only parents can pin messages' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = pinSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: message } = await supabase
      .from('messages')
      .select('is_pinned')
      .eq('id', parsed.data.messageId)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('messages')
      .update({ is_pinned: !message.is_pinned })
      .eq('id', parsed.data.messageId)

    if (error) {
      console.error('Failed to toggle pin:', error)
      return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 })
    }

    return NextResponse.json({ pinned: !message.is_pinned })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

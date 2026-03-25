import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const sendMessageSchema = z.object({
  content: z.string().optional(),
  type: z.enum(['text', 'image', 'video', 'system']).default('text'),
  replyToId: z.string().uuid().optional().nullable(),
  mediaUrls: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['image', 'video']),
    width: z.number().optional(),
    height: z.number().optional(),
    sizeBytes: z.number().optional(),
  })).optional(),
  mentions: z.array(z.string().uuid()).optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  const supabase = createAdminClient()

  let query = supabase
    .from('messages')
    .select(`
      *,
      member:members!member_id(*),
      media(*),
      reply_to:messages!reply_to_id(
        id,
        content,
        type,
        member:members!member_id(id, first_name, last_name, avatar_color)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data: messages, error } = await query

  if (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  const messageIds = messages?.map((m) => m.id) || []

  let reactions: { message_id: string; emoji: string; member_id: string; member: { id: string; first_name: string } }[] = []
  if (messageIds.length > 0) {
    const { data: reactionData } = await supabase
      .from('reactions')
      .select('message_id, emoji, member_id, member:members!member_id(id, first_name)')
      .in('message_id', messageIds)

    reactions = (reactionData || []).map((r: Record<string, unknown>) => ({
      message_id: r.message_id as string,
      emoji: r.emoji as string,
      member_id: r.member_id as string,
      member: Array.isArray(r.member) ? r.member[0] : r.member,
    })) as typeof reactions
  }

  const messagesWithReactions = messages?.map((msg) => {
    const msgReactions = reactions.filter((r) => r.message_id === msg.id)
    const grouped = msgReactions.reduce<Record<string, { emoji: string; count: number; members: { id: string; first_name: string }[]; hasReacted: boolean }>>((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { emoji: r.emoji, count: 0, members: [], hasReacted: false }
      }
      acc[r.emoji].count++
      acc[r.emoji].members.push(r.member)
      if (r.member_id === session.memberId) {
        acc[r.emoji].hasReacted = true
      }
      return acc
    }, {})

    return {
      ...msg,
      reactions: Object.values(grouped),
    }
  })

  return NextResponse.json({
    messages: messagesWithReactions?.reverse() || [],
    hasMore: (messages?.length || 0) === limit,
  })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = sendMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid message', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { content, type, replyToId, mediaUrls, mentions } = parsed.data

    if (!content && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json(
        { error: 'Message must have content or media' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        member_id: session.memberId,
        content: content || null,
        type,
        reply_to_id: replyToId || null,
      })
      .select(`
        *,
        member:members!member_id(*)
      `)
      .single()

    if (error) {
      console.error('Failed to send message:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    if (mediaUrls && mediaUrls.length > 0) {
      const mediaInserts = mediaUrls.map((m) => ({
        message_id: message.id,
        url: m.url,
        type: m.type,
        width: m.width || null,
        height: m.height || null,
        size_bytes: m.sizeBytes || null,
      }))

      const { data: mediaData } = await supabase
        .from('media')
        .insert(mediaInserts)
        .select()

      message.media = mediaData
    }

    if (mentions && mentions.length > 0) {
      const mentionInserts = mentions.map((memberId) => ({
        message_id: message.id,
        mentioned_member_id: memberId,
      }))

      await supabase.from('mentions').insert(mentionInserts)
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

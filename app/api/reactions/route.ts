import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const reactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(4),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = reactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid reaction data' },
        { status: 400 }
      )
    }

    const { messageId, emoji } = parsed.data
    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('member_id', session.memberId)
      .eq('emoji', emoji)
      .single()

    if (existing) {
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id)

      return NextResponse.json({ action: 'removed' })
    }

    const { error } = await supabase
      .from('reactions')
      .insert({
        message_id: messageId,
        member_id: session.memberId,
        emoji,
      })

    if (error) {
      console.error('Failed to add reaction:', error)
      return NextResponse.json(
        { error: 'Failed to add reaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ action: 'added' })
  } catch (error) {
    console.error('Reaction error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

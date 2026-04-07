import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const markReadSchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(100),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = markReadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const inserts = parsed.data.messageIds.map((messageId) => ({
      message_id: messageId,
      member_id: session.memberId,
    }))

    await supabase
      .from('message_reads')
      .upsert(inserts, { onConflict: 'message_id,member_id', ignoreDuplicates: true })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

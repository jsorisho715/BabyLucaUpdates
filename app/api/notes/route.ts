import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const noteSchema = z.object({
  content: z.string().min(1, 'Note cannot be empty').max(2000),
})

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: notes, error } = await supabase
    .from('notes')
    .select('*, member:members!member_id(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }

  return NextResponse.json({ notes: notes || [] })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = noteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid note' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        member_id: session.memberId,
        content: parsed.data.content,
      })
      .select('*, member:members!member_id(*)')
      .single()

    if (error) {
      console.error('Failed to create note:', error)
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
    }

    return NextResponse.json({ note })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

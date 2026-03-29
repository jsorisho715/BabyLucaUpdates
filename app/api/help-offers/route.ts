import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const EARLIEST_DATE = '2026-04-07'

const createSchema = z.object({
  category: z.string().min(1),
  availableDate: z.string().nullable().optional(),
  note: z.string().max(500).optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  availableDate: z.string().nullable().optional(),
  note: z.string().max(500).optional(),
})

const deleteSchema = z.object({
  id: z.string().uuid(),
})

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: offers, error } = await supabase
    .from('help_offers')
    .select('*, member:members!member_id(id, first_name, last_name, avatar_color)')
    .order('available_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch help offers:', error)
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 })
  }

  return NextResponse.json({ offers: offers || [] })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    if (parsed.data.availableDate && parsed.data.availableDate < EARLIEST_DATE) {
      return NextResponse.json(
        { error: 'Date must be April 7, 2026 or later' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: offer, error } = await supabase
      .from('help_offers')
      .insert({
        member_id: session.memberId,
        category: parsed.data.category,
        available_date: parsed.data.availableDate || null,
        note: parsed.data.note || null,
      })
      .select('*, member:members!member_id(id, first_name, last_name, avatar_color)')
      .single()

    if (error) {
      console.error('Failed to create help offer:', error)
      return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 })
    }

    return NextResponse.json({ offer })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    if (parsed.data.availableDate && parsed.data.availableDate < EARLIEST_DATE) {
      return NextResponse.json(
        { error: 'Date must be April 7, 2026 or later' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {}
    if (parsed.data.availableDate !== undefined) updates.available_date = parsed.data.availableDate
    if (parsed.data.note !== undefined) updates.note = parsed.data.note || null

    const { data: offer, error } = await supabase
      .from('help_offers')
      .update(updates)
      .eq('id', parsed.data.id)
      .eq('member_id', session.memberId)
      .select('*, member:members!member_id(id, first_name, last_name, avatar_color)')
      .single()

    if (error) {
      console.error('Failed to update help offer:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ offer })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = deleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let query = supabase
      .from('help_offers')
      .delete()
      .eq('id', parsed.data.id)

    if (!session.isAdmin) {
      query = query.eq('member_id', session.memberId)
    }

    const { error } = await query

    if (error) {
      console.error('Failed to delete help offer:', error)
      return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

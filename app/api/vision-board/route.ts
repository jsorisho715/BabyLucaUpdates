import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const MAX_ITEMS_PER_USER = 5

const itemSchema = z.object({
  type: z.enum(['photo', 'note', 'sticker', 'wish', 'doodle', 'star']),
  content: z.string().min(1),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.5),
  rotation: z.number().min(-15).max(15).default(0),
  color: z.string().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
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

  const { data: items, error } = await supabase
    .from('vision_board_items')
    .select('*, member:members!member_id(id, first_name, last_name, avatar_color)')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch board items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }

  return NextResponse.json({ items: items || [] })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = itemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid item data' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { count } = await supabase
      .from('vision_board_items')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', session.memberId)

    if ((count ?? 0) >= MAX_ITEMS_PER_USER) {
      return NextResponse.json(
        { error: `You can add up to ${MAX_ITEMS_PER_USER} items to the board` },
        { status: 400 }
      )
    }

    const rotation = parsed.data.rotation || (Math.random() * 10 - 5)

    const { data: item, error } = await supabase
      .from('vision_board_items')
      .insert({
        member_id: session.memberId,
        type: parsed.data.type,
        content: parsed.data.content,
        x: parsed.data.x,
        y: parsed.data.y,
        rotation,
        color: parsed.data.color || '#FEF3C7',
      })
      .select('*, member:members!member_id(id, first_name, last_name, avatar_color)')
      .single()

    if (error) {
      console.error('Failed to create board item:', error)
      return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
    }

    return NextResponse.json({ item })
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
      return NextResponse.json({ error: 'Invalid update' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updates: Record<string, number> = {}
    if (parsed.data.x !== undefined) updates.x = parsed.data.x
    if (parsed.data.y !== undefined) updates.y = parsed.data.y

    const { error } = await supabase
      .from('vision_board_items')
      .update(updates)
      .eq('id', parsed.data.id)
      .eq('member_id', session.memberId)

    if (error) {
      console.error('Failed to update item:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
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

    const { data: item } = await supabase
      .from('vision_board_items')
      .select('id, content, type')
      .eq('id', parsed.data.id)
      .eq('member_id', session.memberId)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.type === 'photo') {
      const match = item.content.match(/\/storage\/v1\/object\/public\/media\/(.+)$/)
      if (match?.[1]) {
        await supabase.storage.from('media').remove([match[1]])
      }
    }

    const { error } = await supabase
      .from('vision_board_items')
      .delete()
      .eq('id', parsed.data.id)
      .eq('member_id', session.memberId)

    if (error) {
      console.error('Failed to delete board item:', error)
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

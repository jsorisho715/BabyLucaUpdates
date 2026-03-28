import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const statsSchema = z.object({
  name: z.string().min(1).optional(),
  birth_date: z.string().nullable().optional(),
  weight_lbs: z.number().min(0).max(20).optional().nullable(),
  weight_oz: z.number().min(0).max(16).optional().nullable(),
  length_inches: z.number().min(0).max(30).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
})

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: stats } = await supabase
    .from('baby_stats')
    .select('*')
    .limit(1)
    .single()

  return NextResponse.json({ stats: stats || null })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: 'Only parents can update baby stats' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = statsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('baby_stats')
      .select('id')
      .limit(1)
      .single()

    if (existing) {
      const { data: stats, error } = await supabase
        .from('baby_stats')
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update baby stats:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
      }

      return NextResponse.json({ stats })
    } else {
      const { data: stats, error } = await supabase
        .from('baby_stats')
        .insert(parsed.data)
        .select()
        .single()

      if (error) {
        console.error('Failed to create baby stats:', error)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }

      return NextResponse.json({ stats })
    }
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

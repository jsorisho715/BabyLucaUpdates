import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const columns = session.isAdmin
    ? '*'
    : 'id, first_name, last_name, is_admin, avatar_color, joined_at'

  const { data: members, error } = await supabase
    .from('members')
    .select(columns)
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }

  return NextResponse.json({ members })
}

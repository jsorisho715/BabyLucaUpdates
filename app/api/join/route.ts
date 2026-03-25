import { createAdminClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/session'
import { AVATAR_COLORS } from '@/lib/types'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const joinSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = joinSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, password } = parsed.data

    if (password !== (process.env.CHAT_PASSWORD || 'Luca26')) {
      return NextResponse.json(
        { error: 'Incorrect password. Please try again.' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    const { data: existingMember } = await supabase
      .from('members')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    let member = existingMember

    if (!member) {
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

      const { data: newMember, error } = await supabase
        .from('members')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          avatar_color: avatarColor,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create member:', error)
        return NextResponse.json(
          { error: 'Failed to join. Please try again.' },
          { status: 500 }
        )
      }

      member = newMember

      await supabase.from('messages').insert({
        member_id: member.id,
        content: `${firstName} ${lastName} joined the chat!`,
        type: 'system',
      })
    }

    await createSession({
      memberId: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      isAdmin: member.is_admin,
    })

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Join error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

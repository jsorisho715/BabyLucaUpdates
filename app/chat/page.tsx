import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { ChatRoom } from '@/components/chat/ChatRoom'

export default async function ChatPage() {
  const session = await getSession()

  if (!session) {
    redirect('/')
  }

  return <ChatRoom session={session} />
}

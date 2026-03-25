'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { TabType } from '@/lib/types'
import type { SessionPayload } from '@/lib/session'
import { ChatRoom } from '@/components/chat/ChatRoom'
import { NotesTab } from '@/components/chat/NotesTab'
import { VisionBoard } from '@/components/chat/VisionBoard'
import { TabBar } from '@/components/chat/TabBar'
import { Loader2 } from 'lucide-react'

export default function ChatPage() {
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/session')
      .then((r) => {
        if (!r.ok) throw new Error('Not authenticated')
        return r.json()
      })
      .then((data) => setSession(data.session))
      .catch(() => router.push('/'))
      .finally(() => setIsLoading(false))
  }, [router])

  if (isLoading || !session) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatRoom session={session} />}
        {activeTab === 'notes' && <NotesTab currentMemberId={session.memberId} />}
        {activeTab === 'board' && <VisionBoard currentMemberId={session.memberId} />}
      </div>

      {/* Bottom tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

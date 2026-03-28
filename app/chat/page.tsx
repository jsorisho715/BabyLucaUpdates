'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { TabType } from '@/lib/types'
import type { SessionPayload } from '@/lib/session'
import { ChatRoom } from '@/components/chat/ChatRoom'
import { ForParentsTab } from '@/components/chat/ForParentsTab'
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
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background pb-[52px]">
      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatRoom session={session} />}
        {activeTab === 'notes' && <ForParentsTab currentMemberId={session.memberId} isAdmin={session.isAdmin} />}
        {activeTab === 'board' && <VisionBoard currentMemberId={session.memberId} />}
      </div>

      {/* Bottom tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

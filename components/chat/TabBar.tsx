'use client'

import { cn } from '@/lib/utils'
import type { TabType } from '@/lib/types'
import { MessageSquare, Heart, Sparkles } from 'lucide-react'

interface TabBarProps {
  active: TabType
  onChange: (tab: TabType) => void
}

const tabs: { id: TabType; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'notes', label: 'Notes', icon: Heart },
  { id: 'board', label: 'Vision Board', icon: Sparkles },
]

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="pb-safe flex items-center border-t bg-white/90 backdrop-blur-md">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
            active === id
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className={cn('h-5 w-5', active === id && 'text-primary')} strokeWidth={active === id ? 2.5 : 2} />
          {label}
        </button>
      ))}
    </nav>
  )
}

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users } from 'lucide-react'
import type { Member } from '@/lib/types'

interface MemberDrawerProps {
  members: Member[]
  onlineCount: number
}

export function MemberDrawer({ members, onlineCount }: MemberDrawerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
          <Users className="h-3.5 w-3.5" />
          <span>{members.length}</span>
          <span className="h-2 w-2 rounded-full bg-green-400" title={`${onlineCount} online`} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm" aria-describedby="members-dialog-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Family & Friends
          </DialogTitle>
          <DialogDescription id="members-dialog-desc">
            Everyone following along with Luca&apos;s journey
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-1 pr-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: member.avatar_color }}
                >
                  {member.first_name?.[0] ?? ''}{member.last_name?.[0] ?? ''}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {member.first_name} {member.last_name}
                    </span>
                    {member.is_admin && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        Parent
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Share2, Copy, Check } from 'lucide-react'

export function ShareInvite() {
  const [copied, setCopied] = useState(false)

  const siteUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Luca's Updates",
          text: "Follow along as Baby Luca makes his grand entrance! Join the chat:",
          url: siteUrl,
        })
      } catch {
        // user cancelled share
      }
    } else {
      handleCopy()
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Share2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm" aria-describedby="share-dialog-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Invite Family & Friends
          </DialogTitle>
          <DialogDescription id="share-dialog-desc">
            Share this link so others can follow along
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Share this link with anyone who should follow along.
            They&apos;ll need the family password to join.
          </p>

          <div className="flex gap-2">
            <Input
              readOnly
              value={siteUrl}
              className="h-10 text-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Button className="w-full" onClick={handleNativeShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>

          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              Password: <span className="font-semibold text-foreground">Luca26</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

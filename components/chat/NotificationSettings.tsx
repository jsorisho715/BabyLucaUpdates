'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, Volume2, Vibrate, BellRing } from 'lucide-react'
import type { NotificationPrefs } from '@/hooks/useNotificationPrefs'

interface NotificationSettingsProps {
  prefs: NotificationPrefs
  onUpdate: (patch: Partial<NotificationPrefs>) => void
  onRequestBrowserPermission: () => Promise<boolean>
}

export function NotificationSettings({
  prefs,
  onUpdate,
  onRequestBrowserPermission,
}: NotificationSettingsProps) {
  const [browserSupported, setBrowserSupported] = useState(false)
  const [browserDenied, setBrowserDenied] = useState(false)
  const [vibrateSupported, setVibrateSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBrowserSupported('Notification' in window)
      setBrowserDenied('Notification' in window && Notification.permission === 'denied')
      setVibrateSupported('vibrate' in navigator)
    }
  }, [])

  const handleBrowserToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await onRequestBrowserPermission()
      if (!granted) {
        setBrowserDenied(true)
      }
    } else {
      onUpdate({ browserEnabled: false })
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Notification settings"
        >
          <Bell className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xs sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Notifications</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sound-toggle" className="text-sm font-medium">
                Sound
              </Label>
            </div>
            <Switch
              id="sound-toggle"
              checked={prefs.soundEnabled}
              onCheckedChange={(checked) => onUpdate({ soundEnabled: checked })}
            />
          </div>

          {vibrateSupported && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Vibrate className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="vibrate-toggle" className="text-sm font-medium">
                  Vibrate
                </Label>
              </div>
              <Switch
                id="vibrate-toggle"
                checked={prefs.vibrateEnabled}
                onCheckedChange={(checked) => onUpdate({ vibrateEnabled: checked })}
              />
            </div>
          )}

          {browserSupported && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BellRing className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="browser-toggle" className="text-sm font-medium">
                    Push alerts
                  </Label>
                  {browserDenied && !prefs.browserEnabled && (
                    <p className="text-[10px] leading-tight text-destructive">
                      Blocked — enable in browser settings
                    </p>
                  )}
                </div>
              </div>
              <Switch
                id="browser-toggle"
                checked={prefs.browserEnabled}
                onCheckedChange={handleBrowserToggle}
                disabled={browserDenied && !prefs.browserEnabled}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

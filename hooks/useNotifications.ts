'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useNotificationPrefs, type NotificationPrefs } from './useNotificationPrefs'
import { playNotificationSound, triggerVibration } from '@/lib/sounds'

export function useNotifications() {
  const { prefs, update } = useNotificationPrefs()
  const prefsRef = useRef<NotificationPrefs>(prefs)

  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false

    if (Notification.permission === 'granted') {
      update({ browserEnabled: true })
      return true
    }

    if (Notification.permission === 'denied') return false

    const result = await Notification.requestPermission()
    const granted = result === 'granted'
    update({ browserEnabled: granted })
    return granted
  }, [update])

  const notify = useCallback((title: string, body?: string) => {
    const p = prefsRef.current

    if (p.soundEnabled) {
      playNotificationSound()
    }

    if (p.vibrateEnabled) {
      triggerVibration()
    }

    if (p.browserEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted' && document.hidden) {
        try {
          new Notification(title, {
            body,
            icon: '/favicon.svg',
            tag: `luca-${Date.now()}`,
          })
        } catch {
          // Notification API failed
        }
      }
    }
  }, [])

  return {
    prefs,
    updatePrefs: update,
    requestBrowserPermission,
    notify,
  }
}

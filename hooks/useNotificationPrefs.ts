'use client'

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'luca-notification-prefs'

export interface NotificationPrefs {
  soundEnabled: boolean
  vibrateEnabled: boolean
  browserEnabled: boolean
}

const DEFAULTS: NotificationPrefs = {
  soundEnabled: true,
  vibrateEnabled: true,
  browserEnabled: false,
}

function loadPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

function savePrefs(prefs: NotificationPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // storage full or unavailable
  }
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setPrefs(loadPrefs())
    setMounted(true)
  }, [])

  const update = useCallback((patch: Partial<NotificationPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  return { prefs: mounted ? prefs : DEFAULTS, update }
}

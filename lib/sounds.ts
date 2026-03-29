let audioCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    return audioCtx
  } catch {
    return null
  }
}

export function playNotificationSound() {
  const ctx = getContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime

    const notes = [
      { freq: 784, start: 0, dur: 0.12 },
      { freq: 1047, start: 0.1, dur: 0.18 },
    ]

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.12, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)

      osc.start(now + start)
      osc.stop(now + start + dur)
    })
  } catch {
    // Audio not available
  }
}

export function triggerVibration() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80])
    }
  } catch {
    // Vibration not available
  }
}

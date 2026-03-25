import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = "Luca's Updates — Welcome to the World"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #E8F4FD 0%, #B8DCF0 30%, #89CFF0 60%, #4BA3E3 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.3)',
            marginBottom: 30,
            fontSize: 60,
          }}
        >
          👶
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#1A2A3A',
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}
        >
          {"Luca's Updates"}
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#3A5A7A',
            maxWidth: 600,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Follow along as Baby Luca makes his grand entrance into the world
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 18,
            color: '#5A8AAA',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Real-time updates from Jordyn & Johnathan
        </div>
      </div>
    ),
    { ...size }
  )
}

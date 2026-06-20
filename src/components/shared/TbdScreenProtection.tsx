'use client'

import { useEffect } from 'react'

interface Props { email: string }

export default function TbdScreenProtection({ email }: Props) {
  useEffect(() => {
    // Block printing / save-as-PDF
    const printStyle = document.createElement('style')
    printStyle.textContent = '@media print { body { display: none !important; } }'
    document.head.appendChild(printStyle)

    // Black overlay when page loses visibility (tab switch, app switch, potential screenshot)
    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;background:#000;z-index:99999;display:none;transition:opacity 0.15s;'
    document.body.appendChild(overlay)

    const onVisibility = () => {
      overlay.style.display = document.hidden ? 'block' : 'none'
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Block right-click context menu
    const onContext = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', onContext)

    return () => {
      document.head.removeChild(printStyle)
      document.body.removeChild(overlay)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('contextmenu', onContext)
    }
  }, [])

  // Fixed watermark overlay — pointer-events:none so it doesn't block clicks
  const watermarkText = `CONFIDENTIAL · ${email}`
  const tiles = Array.from({ length: 60 })

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9998,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '-100px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '40px 60px',
          padding: '60px',
          alignContent: 'flex-start',
        }}
      >
        {tiles.map((_, i) => (
          <span
            key={i}
            style={{
              display: 'block',
              transform: 'rotate(-30deg)',
              whiteSpace: 'nowrap',
              fontSize: '13px',
              fontWeight: 600,
              color: 'rgba(0,0,0,0.09)',
              letterSpacing: '0.05em',
              flexShrink: 0,
              width: '260px',
            }}
          >
            {watermarkText}
          </span>
        ))}
      </div>
    </div>
  )
}

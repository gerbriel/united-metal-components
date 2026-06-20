'use client'

import { useEffect } from 'react'

export default function TbdScreenProtection() {
  useEffect(() => {
    // Block print / save-as-PDF
    const printStyle = document.createElement('style')
    printStyle.textContent = '@media print { body { display: none !important; } }'
    document.head.appendChild(printStyle)

    // Solid black overlay shown whenever the tab loses visibility.
    // Most mobile screenshot gestures (home+power, vol+power) briefly
    // suspend the tab, triggering this. Also covers app-switcher previews.
    const blackout = document.createElement('div')
    blackout.style.cssText =
      'position:fixed;inset:0;background:#000;z-index:99999;display:none;'
    document.body.appendChild(blackout)

    const onVisibility = () => {
      blackout.style.display = document.hidden ? 'block' : 'none'
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Canvas → captureStream video overlay.
    // In Chromium-based browsers the video element is composited on a
    // separate GPU layer; screen-capture APIs (getDisplayMedia, remote
    // desktop tools) receive that layer as black instead of the underlying
    // page content. OS-level keyboard shortcuts capture all GPU layers,
    // so this only helps for software-based capture paths.
    let videoEl: HTMLVideoElement | null = null
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, 1, 1)
      // captureStream(0) = 0 fps static frame, lowest overhead
      const stream = (canvas as any).captureStream(0) as MediaStream
      videoEl = document.createElement('video')
      videoEl.srcObject = stream
      videoEl.autoplay = true
      videoEl.muted = true
      videoEl.loop = true
      videoEl.playsInline = true
      // opacity:0.001 keeps the element composited without being visible;
      // opacity:0 would let the browser skip compositing and defeat the trick
      videoEl.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;z-index:9998;' +
        'pointer-events:none;opacity:0.001;object-fit:cover;'
      document.body.appendChild(videoEl)
      videoEl.play().catch(() => {})
    } catch {
      // captureStream not available (Firefox, Safari) — silent fallback
    }

    // Block right-click save / inspect
    const onContext = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', onContext)

    return () => {
      document.head.removeChild(printStyle)
      document.body.removeChild(blackout)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('contextmenu', onContext)
      if (videoEl && document.body.contains(videoEl)) {
        document.body.removeChild(videoEl)
      }
    }
  }, [])

  return null
}

'use client'

import { useEffect } from 'react'

export default function TbdScreenProtection() {
  useEffect(() => {
    // Block print / save-as-PDF
    const printStyle = document.createElement('style')
    printStyle.textContent = '@media print { body { display: none !important; } }'
    document.head.appendChild(printStyle)

    // Solid black overlay — shown when the page loses visibility OR a
    // screenshot key is detected
    const blackout = document.createElement('div')
    blackout.style.cssText =
      'position:fixed;inset:0;background:#000;z-index:99999;display:none;'
    document.body.appendChild(blackout)

    const showBlackout = (ms = 600) => {
      blackout.style.display = 'block'
      setTimeout(() => { blackout.style.display = 'none' }, ms)
    }

    // Tab/app loses visibility (mobile screenshot gestures, app-switcher)
    const onVisibility = () => {
      blackout.style.display = document.hidden ? 'block' : 'none'
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Keyboard screenshot interception.
    //
    // PrintScreen (Windows): keydown fires before most capture tools read the
    // buffer, so showing black here actually beats the capture on many setups.
    //
    // Cmd+Shift+3/4/5 (macOS): macOS intercepts these at the OS level before
    // any browser event fires — they will NEVER reach this handler. Registered
    // here as a no-op in case a browser-level capture tool uses the same keys.
    //
    // Ctrl+P / Cmd+P: prevent the browser print dialog from opening.
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey
      const ctrl = e.ctrlKey
      const shift = e.shiftKey

      // Windows / Linux screenshot keys
      if (e.key === 'PrintScreen' || e.key === 'F13') {
        e.preventDefault()
        showBlackout()
        return
      }

      // macOS screenshot shortcuts (Cmd+Shift+3/4/5/6)
      // NOTE: native macOS shortcuts are OS-intercepted and won't reach here,
      // but browser-based capture tools that simulate these keys will be caught
      if (meta && shift && ['3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault()
        showBlackout()
        return
      }

      // Block print dialog (Ctrl+P or Cmd+P)
      if ((ctrl || meta) && e.key === 'p') {
        e.preventDefault()
        return
      }

      // Snipping Tool shortcut (Windows: Win+Shift+S) — not interceptable since
      // Win key events don't reach the browser, but catch Ctrl+Shift+S used by
      // some third-party capture tools
      if (ctrl && shift && e.key.toLowerCase() === 's') {
        e.preventDefault()
        showBlackout()
      }
    }

    document.addEventListener('keydown', onKeyDown, { capture: true })

    // Canvas → captureStream video overlay.
    // On Chromium, video is composited on a separate GPU layer that
    // software-based screen capture tools (getDisplayMedia, remote desktop)
    // receive as black instead of the live page content.
    let videoEl: HTMLVideoElement | null = null
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, 1, 1)
      const stream = (canvas as any).captureStream(0) as MediaStream
      videoEl = document.createElement('video')
      videoEl.srcObject = stream
      videoEl.autoplay = true
      videoEl.muted = true
      videoEl.loop = true
      videoEl.playsInline = true
      // opacity:0.001 — invisible to the user but forces the browser to keep
      // the element in the GPU compositor; opacity:0 lets the browser skip it
      videoEl.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;z-index:9998;' +
        'pointer-events:none;opacity:0.001;object-fit:cover;'
      document.body.appendChild(videoEl)
      videoEl.play().catch(() => {})
    } catch {
      // captureStream not available (Firefox, Safari) — silent fallback
    }

    // Block right-click context menu
    const onContext = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', onContext)

    return () => {
      document.head.removeChild(printStyle)
      document.body.removeChild(blackout)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('keydown', onKeyDown, { capture: true })
      document.removeEventListener('contextmenu', onContext)
      if (videoEl && document.body.contains(videoEl)) {
        document.body.removeChild(videoEl)
      }
    }
  }, [])

  return null
}

'use client'

import { useEffect, useRef, type MouseEvent } from 'react'
import { X, ArrowRight, Megaphone } from 'lucide-react'
import type { Announcement, AnnouncementBgStyle } from '@/types/database'

export interface ViewProps {
  a: Announcement
  imageUrl: string | null
  href: string | null
  stackAbove?: boolean     // corner card: lift above a simultaneously-shown bottom bar
  onCta: () => void        // fire-and-forget click logging (navigation proceeds via the anchor)
  onDismiss: () => void
}

// Deterministic promo colors — a "navy" bar stays navy in both themes (unlike the
// theme token, whose primary flips to orange in dark mode).
const BG_CLASS: Record<AnnouncementBgStyle, string> = {
  navy:   'bg-[#1E3A63] text-white',
  orange: 'bg-[#EC6A2B] text-white',
  green:  'bg-[#2E7D53] text-white',
  red:    'bg-[#B23B3B] text-white',
  dark:   'bg-[#0E1B30] text-white',
}

function DismissBtn({ onDismiss, className = '' }: { onDismiss: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss"
      className={`shrink-0 grid place-items-center rounded-md opacity-70 hover:opacity-100 transition-opacity ${className}`}
    >
      <X className="w-4 h-4" />
    </button>
  )
}

// ── 1. Announcement bar ───────────────────────────────────────
function BarView({ a, href, onCta, onDismiss }: ViewProps) {
  return (
    <div className={`relative w-full ${BG_CLASS[a.bg_style]} animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <p className="flex-1 text-center text-sm font-medium sm:text-left">
          {a.title}
          {a.body ? <span className="opacity-80"> — {a.body}</span> : null}
          {href && (
            <a href={href} onClick={onCta} className="ml-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-90">
              {a.cta_label || 'Learn more'}<ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </p>
        {a.dismissible && <DismissBtn onDismiss={onDismiss} className="text-white hover:bg-white/15 w-6 h-6" />}
      </div>
    </div>
  )
}

// ── 2. Image hero banner ──────────────────────────────────────
function HeroView({ a, imageUrl, href, onCta, onDismiss }: ViewProps) {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#1E3A63] to-[#2C5286] text-white animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
      <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-0 sm:flex-row">
        <div
          className="relative h-28 w-full shrink-0 bg-cover bg-center sm:h-auto sm:w-2/5"
          style={imageUrl
            ? { backgroundImage: `url(${imageUrl})` }
            : { backgroundImage: 'linear-gradient(135deg, #EC6A2B, #B84418)' }}
        />
        <div className="flex flex-1 flex-col justify-center gap-1.5 px-5 py-4 sm:px-7">
          {a.title && <p className="text-lg font-bold tracking-tight">{a.title}</p>}
          {a.body && <p className="max-w-prose text-sm text-white/80">{a.body}</p>}
          {href && (
            <a href={href} onClick={onCta}
              className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#EC6A2B] px-4 py-2 text-sm font-bold text-[#0E1B30] transition-transform hover:-translate-y-0.5">
              {a.cta_label || 'Learn more'}<ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
      {a.dismissible && <DismissBtn onDismiss={onDismiss} className="absolute right-3 top-3 text-white hover:bg-white/15 w-7 h-7" />}
    </div>
  )
}

// ── 3. Center modal ───────────────────────────────────────────
function ModalView({ a, imageUrl, href, onCta, onDismiss }: ViewProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const ctaRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    // Focus the close button if present, else the CTA — keeps focus inside the modal.
    ;(closeRef.current ?? ctaRef.current)?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && a.dismissible) onDismiss() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onDismiss, a.dismissible])

  const onBackdrop = (e: MouseEvent) => { if (a.dismissible && e.target === e.currentTarget) onDismiss() }

  return (
    <div
      role="dialog" aria-modal="true" aria-label={a.title || 'Announcement'}
      onClick={onBackdrop}
      className="fixed inset-0 z-[100] grid place-items-center bg-[#0E1B30]/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl ring-1 ring-black/10 animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
        <div
          className="h-40 w-full bg-cover bg-center"
          style={imageUrl
            ? { backgroundImage: `url(${imageUrl})` }
            : { backgroundImage: 'linear-gradient(135deg, #2C5286, #EC6A2B)' }}
        />
        {a.dismissible && (
          <button
            ref={closeRef} type="button" onClick={onDismiss} aria-label="Close"
            className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white hover:bg-black/50"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="px-6 py-5 text-center">
          {a.title && <h2 className="text-lg font-bold tracking-tight">{a.title}</h2>}
          {a.body && <p className="mx-auto mt-2 max-w-[34ch] text-sm text-muted-foreground">{a.body}</p>}
          {href && (
            <a ref={ctaRef} href={href} onClick={onCta}
              className="mt-4 block rounded-lg bg-[#EC6A2B] px-4 py-2.5 text-sm font-bold text-[#0E1B30] transition-transform hover:-translate-y-0.5">
              {a.cta_label || 'Learn more'}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 4. Corner card ────────────────────────────────────────────
function CornerView({ a, imageUrl, href, stackAbove, onCta, onDismiss }: ViewProps) {
  return (
    <div className={`fixed right-4 z-40 w-[290px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none ${stackAbove ? 'bottom-24' : 'bottom-4'}`}>
      <div className="relative flex overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        <div
          className="w-20 shrink-0 bg-cover bg-center"
          style={imageUrl
            ? { backgroundImage: `url(${imageUrl})` }
            : { backgroundImage: 'linear-gradient(135deg, #EC6A2B, #B84418)' }}
        />
        <div className="min-w-0 flex-1 px-3 py-2.5 pr-6">
          {a.title && <p className="text-sm font-bold leading-tight">{a.title}</p>}
          {a.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{a.body}</p>}
          {href && (
            <a href={href} onClick={onCta} className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#EC6A2B] hover:underline">
              {a.cta_label || 'Learn more'}<ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
        {a.dismissible && <DismissBtn onDismiss={onDismiss} className="absolute right-1.5 top-1.5 text-muted-foreground hover:text-foreground w-6 h-6" />}
      </div>
    </div>
  )
}

// ── 5. Sticky bottom bar ──────────────────────────────────────
function BottomView({ a, href, onCta, onDismiss }: ViewProps) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground shadow-2xl">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FCEBDF] text-[#EC6A2B] dark:bg-[#38260f]">
          <Megaphone className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          {a.title && <p className="text-sm font-bold leading-tight">{a.title}</p>}
          {a.body && <p className="truncate text-xs text-muted-foreground">{a.body}</p>}
        </div>
        {href && (
          <a href={href} onClick={onCta}
            className="shrink-0 rounded-lg bg-[#1E3A63] px-4 py-2 text-xs font-bold text-white hover:bg-[#2C5286]">
            {a.cta_label || 'Learn more'}
          </a>
        )}
        {a.dismissible && <DismissBtn onDismiss={onDismiss} className="text-muted-foreground hover:text-foreground w-7 h-7" />}
      </div>
    </div>
  )
}

export default function AnnouncementView(props: ViewProps) {
  switch (props.a.format) {
    case 'bar':    return <BarView {...props} />
    case 'hero':   return <HeroView {...props} />
    case 'modal':  return <ModalView {...props} />
    case 'corner': return <CornerView {...props} />
    case 'bottom': return <BottomView {...props} />
    default:       return null
  }
}

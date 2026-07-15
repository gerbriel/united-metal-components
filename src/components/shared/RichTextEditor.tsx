'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Eraser } from 'lucide-react'

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  )
}
const Sep = () => <span className="mx-1 h-5 w-px bg-border" />

// Lightweight WYSIWYG for admin-authored documents (Privacy / Terms). Body is
// an uncontrolled contentEditable seeded once from `value`; edits bubble up as
// HTML. Uses the shared `.site-content-html` styles so editing matches the
// rendered public page.
export default function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || ''
    // Seed once on mount; thereafter the DOM is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => onChange(ref.current?.innerHTML ?? '')
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }
  const addLink = () => {
    const url = window.prompt('Link URL (https://…)')
    if (url) exec('createLink', url)
  }

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-slate-50 p-1">
        <ToolbarButton onClick={() => exec('bold')} title="Bold"><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Italic"><Italic className="w-4 h-4" /></ToolbarButton>
        <Sep />
        <ToolbarButton onClick={() => exec('formatBlock', 'h2')} title="Heading"><Heading2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'h3')} title="Subheading"><Heading3 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'p')} title="Paragraph"><span className="text-xs font-bold">¶</span></ToolbarButton>
        <Sep />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Bullet list"><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={addLink} title="Add link"><Link2 className="w-4 h-4" /></ToolbarButton>
        <Sep />
        <ToolbarButton onClick={() => exec('removeFormat')} title="Clear formatting"><Eraser className="w-4 h-4" /></ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        className="site-content-html min-h-[240px] max-h-[520px] overflow-y-auto p-4 text-sm focus:outline-none"
      />
    </div>
  )
}

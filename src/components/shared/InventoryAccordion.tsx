'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import InventoryActions from '@/components/shared/InventoryActions'
import { iconFor } from '@/lib/nav-categories'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Product, ProductCategory } from '@/types/database'

export interface InventoryGroup {
  id: number
  name: string
  icon: string | null
  items: Product[]
}

interface Props {
  groups: InventoryGroup[]
  isWarehouse: boolean
  isAdmin: boolean
  categories: ProductCategory[]
}

export default function InventoryAccordion({ groups, isWarehouse, isAdmin, categories }: Props) {
  // Track collapsed sections (default: all expanded). Kept in a Set of category
  // ids; survives router.refresh()/realtime updates since state isn't remounted.
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const colSpan = isWarehouse ? 5 : 6

  const supabase = createClient()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // Local copy of the grouped rows so admin reordering feels instant. Resync
  // when the server sends fresh data (router.refresh / realtime) — render-time
  // adjustment rather than an effect, matching CategoryManager.
  const [data, setData] = useState<InventoryGroup[]>(groups)
  const [prevGroups, setPrevGroups] = useState(groups)
  if (groups !== prevGroups) {
    setPrevGroups(groups)
    setData(groups)
  }

  // Move a product up/down within its category group, then persist the group's
  // new order. We renumber the whole group (0..n-1) so the result is correct
  // even if some rows shared a sort_order (e.g. freshly added products at 0).
  const move = async (groupIdx: number, itemIdx: number, dir: -1 | 1) => {
    if (busy) return
    const j = itemIdx + dir
    const items = data[groupIdx]?.items
    if (!items || j < 0 || j >= items.length) return

    const reordered = [...items]
    ;[reordered[itemIdx], reordered[j]] = [reordered[j], reordered[itemIdx]]
    const next = [...data]
    next[groupIdx] = { ...data[groupIdx], items: reordered }
    setData(next)

    setBusy(true)
    const writes = reordered
      .map((p, i) => (p.sort_order === i ? null : { id: p.id, i }))
      .filter((x): x is { id: number; i: number } => x !== null)
      .map(({ id, i }) => supabase.from('products').update({ sort_order: i }).eq('id', id))
    const results = await Promise.all(writes)
    if (results.some((r) => r.error)) toast.error('Failed to save order')
    setBusy(false)
    router.refresh()
  }

  const toggle = (id: number) =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allCollapsed = data.length > 0 && data.every((g) => collapsed.has(g.id))
  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(data.map((g) => g.id)))

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end px-1 pb-2">
        <button
          onClick={toggleAll}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
          <tr>
            <th className="text-left p-3">Product</th>
            {!isWarehouse && <th className="text-right p-3">Price</th>}
            <th className="text-right p-3">Unit</th>
            <th className="text-right p-3">Stock</th>
            <th className="text-right p-3">Status</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        {data.map((g, gi) => {
          const Icon = iconFor(g.icon)
          const isOpen = !collapsed.has(g.id)
          return (
            <tbody key={g.id} className="divide-y">
              <tr className="bg-slate-100/70 border-y">
                <td colSpan={colSpan} className="p-0">
                  <button
                    onClick={() => toggle(g.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-200/50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                    <Icon className="w-4 h-4 text-slate-500" />
                    {g.name}
                    <span className="text-xs font-normal text-muted-foreground">({g.items.length})</span>
                  </button>
                </td>
              </tr>
              {isOpen && g.items.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <div className="flex flex-col shrink-0">
                          <button
                            onClick={() => move(gi, i, -1)}
                            disabled={busy || i === 0}
                            title="Move up"
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => move(gi, i, 1)}
                            disabled={busy || i === g.items.length - 1}
                            title="Move down"
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                      </div>
                    </div>
                  </td>
                  {!isWarehouse && (
                    <td className="p-3 text-right font-semibold">${p.price.toFixed(2)}</td>
                  )}
                  <td className="p-3 text-right text-muted-foreground">{p.unit ?? '—'}</td>
                  <td className="p-3 text-right font-mono">
                    <span className={p.stock_qty < 10 ? 'text-red-600 font-bold' : ''}>{p.stock_qty}</span>
                  </td>
                  <td className="p-3 text-right">
                    {!p.active ? <Badge variant="secondary">Inactive</Badge>
                      : p.stock_qty === 0 ? <Badge className="bg-red-100 text-red-700 border-red-200 border">Out</Badge>
                      : p.stock_qty < 10 ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Low</Badge>
                      : <Badge className="bg-green-100 text-green-700 border-green-200 border">OK</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    <InventoryActions product={p} categories={categories} mode="edit" isAdmin={isAdmin} />
                  </td>
                </tr>
              ))}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}

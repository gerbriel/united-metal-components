'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckSquare, Square, Package } from 'lucide-react'

interface OrderItem {
  id: number
  quantity: number
  products: { name: string; sku: string | null; unit: string | null } | null
}

interface Props {
  orderId: number
  items: OrderItem[]
  onAllStaged?: () => void
}

export default function StagingChecklist({ orderId, items, onAllStaged }: Props) {
  const [staged, setStaged] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState<Set<number>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('order_item_staging')
      .select('order_item_id')
      .eq('order_id', orderId)
      .then(({ data }) => {
        if (data) {
          const ids = new Set<number>(data.map((r) => r.order_item_id as number))
          setStaged(ids)
          if (ids.size === items.length && items.length > 0) onAllStaged?.()
        }
      })
  }, [orderId])

  const toggle = async (itemId: number) => {
    setLoading((prev) => new Set(prev).add(itemId))
    const isStaged = staged.has(itemId)

    if (isStaged) {
      const { error } = await supabase
        .from('order_item_staging')
        .delete()
        .eq('order_item_id', itemId)
      if (error) { toast.error('Failed to update'); setLoading((prev) => { const s = new Set(prev); s.delete(itemId); return s }); return }
      setStaged((prev) => { const s = new Set(prev); s.delete(itemId); return s })
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('order_item_staging')
        .upsert({ order_id: orderId, order_item_id: itemId, staged_by: user?.id ?? null }, { onConflict: 'order_item_id' })
      if (error) { toast.error('Failed to update'); setLoading((prev) => { const s = new Set(prev); s.delete(itemId); return s }); return }
      setStaged((prev) => {
        const s = new Set(prev).add(itemId)
        if (s.size === items.length) onAllStaged?.()
        return s
      })
    }

    setLoading((prev) => { const s = new Set(prev); s.delete(itemId); return s })
  }

  const stagedCount = staged.size
  const totalCount = items.length
  const allDone = stagedCount === totalCount && totalCount > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Check off each item as you stage it for pickup
        </p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
          {stagedCount}/{totalCount} staged
        </span>
      </div>

      <div className="divide-y border rounded-xl overflow-hidden">
        {items.map((item) => {
          const isStaged = staged.has(item.id)
          const isLoading = loading.has(item.id)
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              disabled={isLoading}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${isStaged ? 'bg-green-50' : 'bg-white hover:bg-slate-50'}`}
            >
              {isStaged
                ? <CheckSquare className="w-5 h-5 text-green-500 shrink-0" />
                : <Square className="w-5 h-5 text-muted-foreground shrink-0" />
              }
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isStaged ? 'line-through text-muted-foreground' : ''}`}>
                  {item.products?.name}
                </p>
                {item.products?.sku && (
                  <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>
                )}
              </div>
              <span className="text-sm font-semibold shrink-0 text-muted-foreground">
                ×{item.quantity}{item.products?.unit ? ` ${item.products.unit}` : ''}
              </span>
            </button>
          )
        })}
      </div>

      {allDone && (
        <p className="text-sm text-green-700 font-medium flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          All items staged — you can now mark this order as Ready for Pickup.
        </p>
      )}
    </div>
  )
}

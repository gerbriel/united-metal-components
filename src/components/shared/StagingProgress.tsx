'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Circle, Package } from 'lucide-react'

interface OrderItem {
  id: number
  quantity: number
  products: { name: string; sku: string | null; unit: string | null } | null
}

interface Props {
  orderId: number
  items: OrderItem[]
  initialStagedIds: number[]
}

export default function StagingProgress({ orderId, items, initialStagedIds }: Props) {
  const [stagedIds, setStagedIds] = useState<Set<number>>(new Set(initialStagedIds))
  const supabase = createClient()

  useEffect(() => {
    const refresh = async () => {
      const { data } = await supabase
        .from('order_item_staging')
        .select('order_item_id')
        .eq('order_id', orderId)
      if (data) setStagedIds(new Set(data.map((r) => r.order_item_id as number)))
    }

    const channel = supabase
      .channel(`staging-progress-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item_staging', filter: `order_id=eq.${orderId}` }, refresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  const stagedCount = items.filter((i) => stagedIds.has(i.id)).length
  const allDone = stagedCount === items.length && items.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Our team is preparing your items for pickup</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          {stagedCount}/{items.length} ready
        </span>
      </div>

      <div className="divide-y border rounded-xl overflow-hidden">
        {items.map((item) => {
          const isReady = stagedIds.has(item.id)
          return (
            <div key={item.id} className={`flex items-center gap-3 p-3 transition-colors ${isReady ? 'bg-green-50' : 'bg-white'}`}>
              {isReady
                ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
              }
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isReady ? 'text-green-800' : ''}`}>{item.products?.name}</p>
                {item.products?.sku && <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm">×{item.quantity}{item.products?.unit ? ` ${item.products.unit}` : ''}</p>
                <p className={`text-xs ${isReady ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                  {isReady ? 'Staged' : 'Pending'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {allDone && (
        <p className="text-sm text-green-700 font-medium">
          All items staged — your order will be marked Ready for Pickup shortly.
        </p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Calendar, Loader2, Save } from 'lucide-react'

interface SpecialItem {
  id: number
  product_name: string
  quantity: number
  estimated_arrival_date: string | null
}

export default function SpecialOrderETA({ items, orderId }: { items: SpecialItem[]; orderId: number }) {
  const [dates, setDates] = useState<Record<number, string>>(
    Object.fromEntries(items.map((i) => [i.id, i.estimated_arrival_date ?? '']))
  )
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    const updates = items.map((item) => ({
      id:   item.id,
      date: dates[item.id] || null,
    }))

    for (const { id, date } of updates) {
      await supabase
        .from('order_items')
        .update({ estimated_arrival_date: date })
        .eq('id', id)
    }

    toast.success('Arrival dates saved — customer will see these on their order')
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Set expected arrival dates for special order items. These will be visible to the customer.
      </p>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.product_name}</p>
            <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="date"
              className="h-8 w-40 text-sm"
              value={dates[item.id] ?? ''}
              onChange={(e) => setDates((d) => ({ ...d, [item.id]: e.target.value }))}
            />
          </div>
        </div>
      ))}
      <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save ETAs
      </Button>
    </div>
  )
}

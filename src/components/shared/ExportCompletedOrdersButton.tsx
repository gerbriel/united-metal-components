'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  isAdmin: boolean
  dateFrom?: string | null
  dateTo?: string | null
  customerTypes?: string[]
}

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(...cells: unknown[]): string {
  return cells.map(escapeCSV).join(',')
}

export default function ExportCompletedOrdersButton({ isAdmin, dateFrom, dateTo, customerTypes }: Props) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleExport = async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('orders')
        .select(`
          id, created_at, subtotal, tax, total, notes,
          profiles(full_name, first_name, last_name, company_name, phone, pricing_tier),
          order_items(quantity, unit_price, total_price, products(name, sku))
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (dateFrom) q = q.gte('created_at', dateFrom)
      if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59.999')

      const { data, error } = await q

      if (error) throw error

      let orders = isAdmin
        ? (data ?? [])
        : (data ?? []).filter(
            (o) => (o.profiles as any)?.pricing_tier !== 'contractor_tax_exempt_tbd'
          )

      if (customerTypes && customerTypes.length > 0) {
        orders = orders.filter((o) => {
          const tier = (o.profiles as any)?.pricing_tier ?? '__unassigned__'
          return customerTypes.includes(tier)
        })
      }

      const lines: string[] = [
        row(
          'Order #', 'Date', 'Customer Name', 'Company',
          'Phone', 'Product', 'SKU', 'Qty', 'Unit Price',
          'Line Total', 'Order Subtotal', 'Tax', 'Order Total', 'Notes'
        ),
      ]

      for (const o of orders) {
        const p = o.profiles as any
        const customerName =
          p?.first_name && p?.last_name
            ? `${p.first_name} ${p.last_name}`
            : p?.full_name ?? ''
        const date = new Date(o.created_at).toLocaleDateString('en-US')
        const items = (o.order_items as any[]) ?? []

        if (items.length === 0) {
          lines.push(row(
            o.id, date, customerName, p?.company_name ?? '',
            p?.phone ?? '', '', '', '', '', '',
            o.subtotal?.toFixed(2) ?? '', o.tax?.toFixed(2) ?? '',
            o.total?.toFixed(2) ?? '', o.notes ?? ''
          ))
        } else {
          items.forEach((item: any, idx: number) => {
            lines.push(row(
              o.id,
              date,
              customerName,
              p?.company_name ?? '',
              p?.phone ?? '',
              item.products?.name ?? '',
              item.products?.sku ?? '',
              item.quantity,
              item.unit_price?.toFixed(2) ?? '',
              item.total_price?.toFixed(2) ?? '',
              idx === 0 ? (o.subtotal?.toFixed(2) ?? '') : '',
              idx === 0 ? (o.tax?.toFixed(2) ?? '') : '',
              idx === 0 ? (o.total?.toFixed(2) ?? '') : '',
              idx === 0 ? (o.notes ?? '') : ''
            ))
          })
        }
      }

      const csv = lines.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `completed-orders-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Exported ${orders?.length ?? 0} orders`)
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs"
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Download className="w-3.5 h-3.5" />}
      Export Completed
    </Button>
  )
}

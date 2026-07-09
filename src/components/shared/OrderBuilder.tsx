'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import CreateCustomerDialog from '@/components/shared/CreateCustomerDialog'
import { COLORS, PANEL_SKUS, COLOR_SKUS, isOverstockSku } from '@/lib/product-config'
import { ORDER_STATUS_LABEL } from '@/types/database'

interface CustomerRow {
  id: string
  full_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  pricing_tier: string | null
}
interface ProductRow { id: number; name: string; sku: string | null; price: number; unit: string | null }
interface Line {
  key: string
  product: ProductRow
  qty: string
  unitPrice: string
  lengthFt: string
  lengthIn: string
  color: string
}

const TAX_RATE = 0.0825
const EXEMPT = new Set(['retail_tax_exempt', 'contractor_tax_exempt'])
const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'completed']

const needsLength = (sku?: string | null) =>
  !!sku && (PANEL_SKUS.has(sku) || isOverstockSku(sku) || sku === 'HAT-CHANNEL' || sku === 'BRACE')
const needsColor = (sku?: string | null) => !!sku && (COLOR_SKUS.has(sku) || isOverstockSku(sku))

const custName = (c: CustomerRow) => c.full_name || c.company_name || c.email || 'Customer'

export default function OrderBuilder({ customers, products }: { customers: CustomerRow[]; products: ProductRow[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [allCustomers, setAllCustomers] = useState<CustomerRow[]>(customers)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [custSearch, setCustSearch] = useState('')

  const [prodSearch, setProdSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [status, setStatus] = useState('pending')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const customer = allCustomers.find((c) => c.id === customerId) ?? null
  const exempt = !!customer && EXEMPT.has(customer.pricing_tier ?? '')

  const custMatches = useMemo(() => {
    const q = custSearch.trim().toLowerCase()
    if (!q) return []
    return allCustomers
      .filter((c) => [c.full_name, c.company_name, c.email, c.phone].some((v) => v?.toLowerCase().includes(q)))
      .slice(0, 8)
  }, [allCustomers, custSearch])

  const prodMatches = useMemo(() => {
    const q = prodSearch.trim().toLowerCase()
    if (!q) return []
    return products.filter((p) => `${p.name} ${p.sku ?? ''}`.toLowerCase().includes(q)).slice(0, 8)
  }, [products, prodSearch])

  const addProduct = (p: ProductRow) => {
    setLines((ls) => [
      ...ls,
      { key: `${p.id}-${Date.now()}`, product: p, qty: '1', unitPrice: String(p.price ?? 0), lengthFt: '', lengthIn: '', color: '' },
    ])
    setProdSearch('')
  }
  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key))

  const lineTotal = (l: Line) => (parseFloat(l.unitPrice) || 0) * (parseFloat(l.qty) || 0)
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0)
  const tax = exempt ? 0 : subtotal * TAX_RATE
  const total = subtotal + tax

  const submit = async () => {
    if (!customer) { toast.error('Select a customer'); return }
    const valid = lines.filter((l) => (parseFloat(l.qty) || 0) > 0)
    if (valid.length === 0) { toast.error('Add at least one line item'); return }
    setSaving(true)

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: customer.id,
        status,
        subtotal,
        tax,
        total,
        shipping_name: custName(customer),
        shipping_phone: customer.phone,
        shipping_addr: '9191 W Whitesbridge Ave, Fresno, CA 93706 (Pickup)',
        notes: notes.trim() || null,
      })
      .select('id')
      .single()
    if (error || !order) { toast.error(error?.message ?? 'Failed to create order'); setSaving(false); return }

    const orderId = (order as { id: number }).id
    const { error: itemsErr } = await supabase.from('order_items').insert(
      valid.map((l) => {
        const qty = parseFloat(l.qty) || 0
        const unit = parseFloat(l.unitPrice) || 0
        const ft = parseInt(l.lengthFt) || 0
        const inch = parseInt(l.lengthIn) || 0
        const detail: string[] = []
        if (ft || inch) detail.push(inch ? `${ft} ft ${inch} in` : `${ft} ft`)
        if (l.color) detail.push(`Color: ${l.color}`)
        return {
          order_id: orderId,
          product_id: l.product.id,
          quantity: qty,
          unit_price: unit,
          total_price: unit * qty,
          item_color: l.color || null,
          length_feet: ft || null,
          notes: detail.length ? detail.join(' · ') : null,
        }
      }),
    )
    if (itemsErr) { toast.error(itemsErr.message); setSaving(false); return }

    toast.success('Order created')
    router.push(`/dashboard/orders/${orderId}`)
  }

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        {/* Customer */}
        <div className="border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Customer</h2>
            <CreateCustomerDialog
              triggerLabel="New Customer"
              triggerClassName="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              onCreated={(c) => {
                setAllCustomers((cs) => [{ id: c.id, full_name: c.name, company_name: null, email: null, phone: null, pricing_tier: null }, ...cs])
                setCustomerId(c.id)
                setCustSearch('')
              }}
            />
          </div>
          {customer ? (
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{custName(customer)}</p>
                <p className="text-xs text-muted-foreground">
                  {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'No contact info'}
                  {exempt ? ' · Tax exempt' : ''}
                </p>
              </div>
              <button onClick={() => setCustomerId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="relative">
              <Input value={custSearch} onChange={(e) => setCustSearch(e.target.value)} placeholder="Search customer by name, company, email, phone…" />
              {custMatches.length > 0 && (
                <div className="mt-1 border rounded-lg divide-y max-h-56 overflow-y-auto">
                  {custMatches.map((c) => (
                    <button key={c.id} onClick={() => { setCustomerId(c.id); setCustSearch('') }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                      <span className="font-medium">{custName(c)}</span>
                      {c.email && <span className="text-muted-foreground"> · {c.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">Items</h2>
          <div className="relative">
            <Input value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} placeholder="Add a product — search by name or SKU…" />
            {prodMatches.length > 0 && (
              <div className="mt-1 border rounded-lg divide-y max-h-56 overflow-y-auto">
                {prodMatches.map((p) => (
                  <button key={p.id} onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between">
                    <span><span className="font-medium">{p.name}</span>{p.sku && <span className="text-muted-foreground"> · {p.sku}</span>}</span>
                    <span className="text-muted-foreground">${Number(p.price).toFixed(2)}{p.unit ? `/${p.unit}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No items yet — search above to add products.</p>
          ) : (
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.key} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{l.product.name}{l.product.sku && <span className="text-xs text-muted-foreground"> · {l.product.sku}</span>}</p>
                    <button onClick={() => removeLine(l.key)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={0} className="h-8 w-20" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} />
                    </div>
                    {needsLength(l.product.sku) && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Ft</Label>
                          <Input type="number" min={0} className="h-8 w-16" value={l.lengthFt} onChange={(e) => setLine(l.key, { lengthFt: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">In</Label>
                          <Input type="number" min={0} max={11} className="h-8 w-16" value={l.lengthIn} onChange={(e) => setLine(l.key, { lengthIn: e.target.value })} />
                        </div>
                      </>
                    )}
                    {needsColor(l.product.sku) && (
                      <div className="space-y-1 min-w-[140px]">
                        <Label className="text-xs">Color</Label>
                        <Select value={l.color} onValueChange={(v) => setLine(l.key, { color: v ?? '' })}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— None —</SelectItem>
                            {COLORS.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Unit price</Label>
                      <Input type="number" step="0.01" className="h-8 w-24" value={l.unitPrice} onChange={(e) => setLine(l.key, { unitPrice: e.target.value })} />
                    </div>
                    <div className="ml-auto text-right">
                      <Label className="text-xs">Line total</Label>
                      <p className="font-mono font-semibold text-sm">${lineTotal(l).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-4">
        <div className="border rounded-xl p-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s] ?? s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax{exempt ? ' (exempt)' : ''}</span><span className="font-mono">${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span className="font-mono text-primary">${total.toFixed(2)}</span></div>
          </div>
          <Button className="w-full gap-2" onClick={submit} disabled={saving || !customer || lines.length === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Order
          </Button>
        </div>
      </div>
    </div>
  )
}

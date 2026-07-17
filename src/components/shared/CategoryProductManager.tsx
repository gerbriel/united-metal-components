'use client'

import { createElement, Fragment, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import InventoryActions from '@/components/shared/InventoryActions'
import { iconFor } from '@/lib/nav-categories'
import { isOverstockSku, isTrimSku, isHatBraceSku, swatchStyle } from '@/lib/product-config'
import { submitInventoryRequest } from '@/lib/inventory/requests'
import { ChevronRight, Pencil, Loader2, ArrowRight } from 'lucide-react'
import type { Product, ProductCategory } from '@/types/database'
import type { TrimVariant, HatBraceVariant } from '@/components/shared/InventoryAccordion'

interface Props {
  category: { id: number; name: string; icon: string | null }
  products: (Product & { product_categories: unknown })[]
  isWarehouse: boolean
  isAdmin: boolean
  // Office employees edit/archive products through the approval queue.
  isOffice: boolean
  categories: ProductCategory[]
  // Live totals for overstock parent products, keyed by product id.
  overstockStats: Record<number, { pieces: number; totalValue: number }>
  // Explicit Contractor / Retail tier-price overrides, keyed by product id.
  tierPrices: Record<number, { contractor?: number; retail?: number }>
  // Per-variation stock lines for trim (per color) and hat/brace (per length),
  // keyed by product id. Drive the expandable sub-rows under those products.
  trimStock: Record<number, TrimVariant[]>
  hatBraceStock: Record<number, HatBraceVariant[]>
}

// A trim/hat-brace stock line normalized for a uniform sub-row render.
interface VariantRow {
  table: 'trim_stock' | 'hat_brace_stock'
  id: number
  swatch?: CSSProperties
  name: string
  coil: string | null
  qty: number
  // Human label for the approval summary / toast, e.g. "J-Trim · White".
  summaryLabel: string
}

// One tier-price cell: the explicit override in bold, or the base-price fallback
// muted so staff can tell at a glance which prices are actually set per tier.
function TierPrice({ override, base }: { override?: number; base: number }) {
  const isSet = override != null
  return (
    <span className={isSet ? 'font-semibold' : 'text-muted-foreground'}>
      ${(isSet ? override : base).toFixed(2)}
    </span>
  )
}

export default function CategoryProductManager({
  category,
  products,
  isWarehouse,
  isAdmin,
  isOffice,
  categories,
  overstockStats,
  tierPrices,
  trimStock,
  hatBraceStock,
}: Props) {
  // +2 price columns (Contractor, Retail) for non-warehouse staff.
  const colSpan = isWarehouse ? 5 : 7

  const supabase = createClient()
  const router = useRouter()

  // Trim / hat-brace products whose per-variation stock lines are expanded.
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggleExpand = (id: number) =>
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Inline per-variation qty edit. Keyed by table+id since trim_stock and
  // hat_brace_stock ids can collide.
  const [qtyEditing, setQtyEditing] = useState<{ table: 'trim_stock' | 'hat_brace_stock'; id: number } | null>(null)
  const [qtyForm, setQtyForm] = useState('')
  const [qtySaving, setQtySaving] = useState(false)
  // Everyone on this staff-only screen may adjust piece counts; office edits
  // route through the approval queue (see saveQty), admin/warehouse write live.
  const canEditQty = isAdmin || isWarehouse || isOffice

  // Persist a new qty for one variation. Admin/warehouse write trim_stock /
  // hat_brace_stock directly; office (isOffice && !isAdmin) proposes the change
  // to the approval queue instead. Mirrors TrimStockManager.handleUpdateQty.
  const saveQty = async (table: 'trim_stock' | 'hat_brace_stock', id: number, summaryLabel: string) => {
    const q = parseInt(qtyForm, 10)
    if (isNaN(q) || q < 0) { toast.error('Enter a valid quantity'); return }
    setQtySaving(true)
    if (isOffice && !isAdmin) {
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: table,
        operation: 'update',
        targetId: id,
        payload: { qty: q },
        summary: `Set ${summaryLabel} qty to ${q}`,
      })
      if (error) { toast.error(error.message); setQtySaving(false); return }
      toast.success('Submitted for approval')
      setQtyEditing(null)
      setQtySaving(false)
      return
    }
    const { error } = await supabase.from(table).update({ qty: q } as never).eq('id', id)
    if (error) { toast.error(error.message); setQtySaving(false); return }
    toast.success('Quantity updated')
    setQtyEditing(null)
    setQtySaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-700">
          {createElement(iconFor(category.icon), { className: 'w-4 h-4 text-slate-500' })}
          {category.name}
          <span className="text-xs font-normal text-muted-foreground">({products.length})</span>
        </h2>
        <InventoryActions categories={categories} mode="add" isAdmin={isAdmin} isOffice={isOffice} />
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No products in this category.</p>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-3">Product</th>
                  {!isWarehouse && <th className="text-right p-3">Contractor</th>}
                  {!isWarehouse && <th className="text-right p-3">Retail</th>}
                  <th className="text-right p-3">Unit</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-right p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => {
                  // Trim → per-color lines; hat/brace → per-length lines. Only these
                  // product kinds get an expandable region, and only when they have
                  // variation stock rows to show. Normalize both into VariantRow[].
                  const isTrim = isTrimSku(p.sku)
                  const variants: VariantRow[] = isTrim
                    ? (trimStock[p.id] ?? []).map((v): VariantRow => ({
                        table: 'trim_stock',
                        id: v.id,
                        swatch: swatchStyle(v.finishes ? { hex: v.finishes.hex } : null),
                        name: v.finishes?.name ?? `Finish ${v.finish_id}`,
                        coil: v.product_coils?.coil_identifier ?? null,
                        qty: v.qty,
                        summaryLabel: `${p.name} · ${v.finishes?.name ?? `Finish ${v.finish_id}`}`,
                      }))
                    : isHatBraceSku(p.sku)
                    ? (hatBraceStock[p.id] ?? []).map((v): VariantRow => ({
                        table: 'hat_brace_stock',
                        id: v.id,
                        name: `${v.length_ft} ft`,
                        coil: v.product_coils?.coil_identifier ?? null,
                        qty: v.qty,
                        summaryLabel: `${p.name} · ${v.length_ft} ft`,
                      }))
                    : []
                  const hasVariants = variants.length > 0
                  const isRowExpanded = expanded.has(p.id)
                  // Trim / hat-brace parent stock = the SUM of its per-variation lines
                  // (the source of truth), not the stale colorless products.stock_qty.
                  const isVariantProduct = isTrim || isHatBraceSku(p.sku)
                  const variantTotal = variants.reduce((s, v) => s + v.qty, 0)
                  return (
                    <Fragment key={p.id}>
                      <tr className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="min-w-0">
                            <p className="font-medium">{p.name}</p>
                            {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                          </div>
                        </td>
                        {(() => {
                          // Overstock parent rows reflect the logged pieces: price = total
                          // value of all pieces, unit label "Total", stock = total piece
                          // count — not the shell product's stale per-foot fields.
                          const over = isOverstockSku(p.sku)
                          const stats = over ? overstockStats[p.id] ?? { pieces: 0, totalValue: 0 } : null
                          const stock = stats ? stats.pieces : isVariantProduct ? variantTotal : p.stock_qty
                          return (
                            <>
                              {!isWarehouse && (
                                stats ? (
                                  // Overstock parents are priced per-listing, not per tier —
                                  // show their total logged value across both price columns.
                                  <td className="p-3 text-right font-semibold" colSpan={2} title="Total value of overstock pieces">
                                    ${stats.totalValue.toFixed(2)}
                                  </td>
                                ) : (
                                  <>
                                    <td className="p-3 text-right">
                                      <TierPrice override={tierPrices[p.id]?.contractor} base={p.price} />
                                    </td>
                                    <td className="p-3 text-right">
                                      <TierPrice override={tierPrices[p.id]?.retail} base={p.price} />
                                    </td>
                                  </>
                                )
                              )}
                              <td className="p-3 text-right text-muted-foreground">{over || isVariantProduct ? 'Total' : p.unit ?? '—'}</td>
                              <td className="p-3 text-right font-mono">
                                <span className={stock < 10 && !over ? 'text-red-600 font-bold' : ''}>{stock}</span>
                              </td>
                              <td className="p-3 text-right">
                                {!p.active ? <Badge variant="secondary">Inactive</Badge>
                                  : stock === 0 ? <Badge className="bg-red-100 text-red-700 border-red-200 border">Out</Badge>
                                  : over ? <Badge className="bg-green-100 text-green-700 border-green-200 border">OK</Badge>
                                  : stock < 10 ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Low</Badge>
                                  : <Badge className="bg-green-100 text-green-700 border-green-200 border">OK</Badge>}
                              </td>
                            </>
                          )
                        })()}
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {isVariantProduct && (
                              <button
                                onClick={() => toggleExpand(p.id)}
                                aria-expanded={isRowExpanded}
                                aria-label={isRowExpanded ? 'Hide variations' : 'Show variations'}
                                title={isRowExpanded ? 'Hide variations' : 'Show variations'}
                                className="text-muted-foreground hover:text-foreground shrink-0"
                              >
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isRowExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                            <InventoryActions product={p} categories={categories} mode="edit" isAdmin={isAdmin} isOffice={isOffice} />
                          </div>
                        </td>
                      </tr>
                      {isVariantProduct && isRowExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={colSpan} className="p-0">
                            <div className="pl-9 pr-3 py-2">
                              <div className="rounded-lg border bg-white overflow-hidden">
                                {hasVariants ? (
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-50 text-muted-foreground border-b">
                                    <tr>
                                      <th className="text-left px-3 py-1.5 font-medium">{isTrim ? 'Color' : 'Length'}</th>
                                      <th className="text-left px-3 py-1.5 font-medium">Coil</th>
                                      <th className="text-right px-3 py-1.5 font-medium">On Hand</th>
                                      {canEditQty && <th className="text-right px-3 py-1.5 font-medium">Edit</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {variants.map((v) => {
                                      const editing = qtyEditing?.table === v.table && qtyEditing?.id === v.id
                                      return (
                                        <tr key={`${v.table}:${v.id}`} className="hover:bg-slate-50/60">
                                          <td className="px-3 py-1.5">
                                            <span className="inline-flex items-center gap-1.5">
                                              {v.swatch && <span className="w-4 h-4 rounded-full border border-slate-200 shrink-0" style={v.swatch} />}
                                              <span className="font-medium">{v.name}</span>
                                            </span>
                                          </td>
                                          <td className="px-3 py-1.5 font-mono text-muted-foreground">{v.coil ?? '—'}</td>
                                          <td className="px-3 py-1.5 text-right">
                                            {editing ? (
                                              <Input
                                                type="number" min={0}
                                                className="h-7 w-20 text-xs text-right ml-auto"
                                                value={qtyForm}
                                                onChange={(e) => setQtyForm(e.target.value)}
                                              />
                                            ) : (
                                              <span className={`font-mono font-semibold ${v.qty === 0 ? 'text-red-600' : 'text-green-700'}`}>{v.qty}</span>
                                            )}
                                          </td>
                                          {canEditQty && (
                                            <td className="px-3 py-1.5 text-right">
                                              {editing ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                  <Button size="sm" className="h-7 text-xs" disabled={qtySaving} onClick={() => saveQty(v.table, v.id, v.summaryLabel)}>
                                                    {qtySaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                                                  </Button>
                                                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setQtyEditing(null)}>Cancel</button>
                                                </div>
                                              ) : (
                                                <Button
                                                  size="sm" variant="outline" className="h-7 text-xs"
                                                  onClick={() => { setQtyEditing({ table: v.table, id: v.id }); setQtyForm(String(v.qty)) }}
                                                >
                                                  <Pencil className="w-3 h-3 mr-1" />Qty
                                                </Button>
                                              )}
                                            </td>
                                          )}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                ) : (
                                  <p className="px-3 py-2 text-xs text-muted-foreground">No stock lines recorded yet.</p>
                                )}
                                <div className="flex justify-end border-t bg-slate-50/60 px-3 py-1.5">
                                  <Link
                                    href={isTrim ? '/dashboard/inventory/trim' : '/dashboard/inventory/hat-brace'}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                  >
                                    Manage in {isTrim ? 'Trim' : 'Hat/Brace'}
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

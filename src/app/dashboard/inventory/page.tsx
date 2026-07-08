export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import InventoryActions from '@/components/shared/InventoryActions'
import InventoryNav from '@/components/shared/InventoryNav'
import RealtimeRefresh from '@/components/shared/RealtimeRefresh'
import { isWarehouseRole, isAdminRole } from '@/types/database'
import type { Product } from '@/types/database'
import { iconFor } from '@/lib/nav-categories'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inventory — Dashboard' }

type JoinedCategory = { id: number; name: string; slug: string; sort_order: number; icon: string | null } | null
type InvProduct = Product & { product_categories: JoinedCategory }

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, employee_role')
    .eq('id', user!.id)
    .single()

  const role = (profile as { role?: string } | null)?.role ?? ''
  const isWarehouse = isWarehouseRole(role)
  const isAdmin = isAdminRole(role)

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_categories(id, name, slug, sort_order, icon)')
      .order('name'),
    supabase.from('product_categories').select('*').order('sort_order').order('name'),
  ])

  // Group products under their category, in the same order the storefront uses
  // (category sort_order); products keep their name order within each group.
  const byCat = new Map<number, InvProduct[]>()
  for (const p of (products ?? []) as InvProduct[]) {
    const cid = p.product_categories?.id ?? -1
    const arr = byCat.get(cid)
    if (arr) arr.push(p)
    else byCat.set(cid, [p])
  }

  const groups = (categories ?? [])
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon as string | null, items: byCat.get(c.id) ?? [] }))
    .filter((g) => g.items.length > 0)
  const uncategorized = byCat.get(-1)
  if (uncategorized?.length) groups.push({ id: -1, name: 'Uncategorized', icon: null, items: uncategorized })

  const colSpan = isWarehouse ? 5 : 6

  return (
    <div className="space-y-5">
      <RealtimeRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Standard products — grouped by storefront category</p>
        </div>
        <InventoryActions categories={categories ?? []} />
      </div>

      <InventoryNav active="products" />

      <Card>
        <div className="overflow-x-auto">
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
            {groups.map((g) => {
              const Icon = iconFor(g.icon)
              return (
                <tbody key={g.id} className="divide-y">
                  <tr className="bg-slate-100/70 border-y">
                    <td colSpan={colSpan} className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                        <Icon className="w-4 h-4 text-slate-500" />
                        {g.name}
                        <span className="text-xs font-normal text-muted-foreground">({g.items.length})</span>
                      </span>
                    </td>
                  </tr>
                  {g.items.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <p className="font-medium">{p.name}</p>
                        {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
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
                        <InventoryActions product={p} categories={categories ?? []} mode="edit" isAdmin={isAdmin} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              )
            })}
          </table>
        </div>
      </Card>
    </div>
  )
}

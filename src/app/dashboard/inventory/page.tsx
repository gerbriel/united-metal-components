export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import InventoryActions from '@/components/shared/InventoryActions'
import InventoryNav from '@/components/shared/InventoryNav'
import { isWarehouseRole } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inventory — Dashboard' }

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, employee_role')
    .eq('id', user!.id)
    .single()

  const isWarehouse = isWarehouseRole(
    (profile as any)?.role ?? '',
    (profile as any)?.employee_role ?? null
  )

  const { data: products } = await supabase
    .from('products')
    .select('*, product_categories(name)')
    .order('name')

  const { data: categories } = await supabase.from('product_categories').select('*').order('name')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Standard products — units, hardware, accessories</p>
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
                <th className="text-left p-3">Category</th>
                {!isWarehouse && <th className="text-right p-3">Price</th>}
                <th className="text-right p-3">Unit</th>
                <th className="text-right p-3">Stock</th>
                <th className="text-right p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products?.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <p className="font-medium">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                  </td>
                  <td className="p-3 text-muted-foreground">{(p as any).product_categories?.name}</td>
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
                    <InventoryActions product={p} categories={categories ?? []} mode="edit" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

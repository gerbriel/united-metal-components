'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import type { Product, ProductCategory } from '@/types/database'

interface Props {
  product?: Product
  categories: ProductCategory[]
  mode?: 'add' | 'edit'
  isAdmin?: boolean
}

export default function InventoryActions({ product, categories, mode = 'add', isAdmin = true }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category_id: product?.category_id?.toString() ?? '',
    description: product?.description ?? '',
    unit: product?.unit ?? '',
    price: product?.price?.toString() ?? '',
    stock_qty: product?.stock_qty?.toString() ?? '0',
    weight_lbs: product?.weight_lbs?.toString() ?? '',
    active: product?.active ?? true,
  })
  const supabase = createClient()
  const router = useRouter()

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return }
    setLoading(true)

    const payload = {
      name: form.name,
      sku: form.sku || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      description: form.description || null,
      unit: form.unit || null,
      price: parseFloat(form.price),
      stock_qty: parseInt(form.stock_qty) || 0,
      weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
      active: form.active,
    }

    if (mode === 'edit' && product) {
      const newQty = parseInt(form.stock_qty) || 0
      const qtyChanged = product.stock_qty !== newQty

      if (!isAdmin && qtyChanged) {
        // Warehouse: route stock qty changes through approval queue
        const { error: entryErr } = await supabase.from('inventory_entries').insert({
          entry_type: 'stock_qty',
          product_id: product.id,
          old_value:  product.stock_qty,
          new_value:  newQty,
        })
        if (entryErr) { toast.error('Failed to submit update'); setLoading(false); return }
        toast.success('Stock update submitted for admin approval')
        // Only apply the non-qty fields directly if admin
        const { stock_qty: _, ...nonQtyPayload } = payload
        const { error } = await supabase.from('products').update(nonQtyPayload).eq('id', product.id)
        if (error) toast.error('Some fields may not have saved')
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id)
        if (error) { toast.error('Failed to update product'); setLoading(false); return }
        toast.success('Product updated')
      }
    } else {
      const { error } = await supabase.from('products').insert(payload)
      if (error) { toast.error('Failed to add product'); setLoading(false); return }
      toast.success('Product added')
    }

    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === 'add' ? (
        <DialogTrigger render={
          <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors">
            <Plus className="w-4 h-4" />Add Product
          </button>
        } />
      ) : (
        <DialogTrigger render={
          <button className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
        } />
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Product' : 'Edit Product'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Product Name *</Label>
            <Input value={form.name} onChange={set('name')} placeholder="e.g. 29 GA Sheet Metal" />
          </div>
          <div className="space-y-1.5">
            <Label>SKU</Label>
            <Input value={form.sku} onChange={set('sku')} placeholder="e.g. PANEL-29GA" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(v: string | null) => setForm((f) => ({ ...f, category_id: v ?? '' }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Price *</Label>
            <Input type="number" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Unit (per)</Label>
            <Input value={form.unit} onChange={set('unit')} placeholder="Foot / Each / Bundle" />
          </div>
          <div className="space-y-1.5">
            <Label>Stock Quantity</Label>
            <Input type="number" value={form.stock_qty} onChange={set('stock_qty')} />
          </div>
          <div className="space-y-1.5">
            <Label>Weight (lbs)</Label>
            <Input type="number" step="0.001" value={form.weight_lbs} onChange={set('weight_lbs')} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={set('description')} placeholder="Brief description" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'add' ? 'Add Product' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

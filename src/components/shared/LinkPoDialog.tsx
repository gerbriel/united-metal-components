'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Link2 } from 'lucide-react'

export interface Vendor { id: string; name: string }
export interface OpenPo { id: string; po_number: string | null; vendor_id: string | null; status: string }

interface Props {
  table: 'product_coils' | 'tube_bundles'
  rowId: number
  vendors: Vendor[]
  openPos: OpenPo[]
  currentVendorId?: string | null
  currentPoId?: string | null
  onLinked?: () => void
}

// Attach an already-received coil or tube bundle to a vendor + PO after the
// fact, or spin up a new draft PO to attach it to.
export default function LinkPoDialog({ table, rowId, vendors, openPos, currentVendorId, currentPoId, onLinked }: Props) {
  const [open, setOpen]         = useState(false)
  const [pos, setPos]           = useState<OpenPo[]>(openPos)
  const [vendorId, setVendorId] = useState(currentVendorId ?? '')
  const [poId, setPoId]         = useState(currentPoId ?? '')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving]     = useState(false)
  const supabase = createClient()

  const vendorPos = pos.filter((p) => !vendorId || p.vendor_id === vendorId)

  const createPo = async () => {
    setCreating(true)
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({ vendor_id: vendorId || null, status: 'draft' })
      .select('id, po_number, vendor_id, status')
      .single()
    if (error || !data) { toast.error(error?.message ?? 'Failed to create PO'); setCreating(false); return }
    setPos((prev) => [data as OpenPo, ...prev])
    setPoId((data as OpenPo).id)
    toast.success('Draft PO created')
    setCreating(false)
  }

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from(table)
      .update({ vendor_id: vendorId || null, po_id: poId || null })
      .eq('id', rowId)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Linked to purchase order')
    setSaving(false)
    setOpen(false)
    onLinked?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm" variant="outline" className="h-7 text-xs">
          <Link2 className="w-3 h-3 mr-1" />PO
        </Button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Link to Purchase Order</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Select value={vendorId || '__none__'} onValueChange={(v) => { setVendorId(v === '__none__' ? '' : (v ?? '')); setPoId('') }}>
              <SelectTrigger><SelectValue placeholder="Select vendor…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Purchase Order</Label>
            <div className="flex gap-2">
              <Select value={poId || '__none__'} onValueChange={(v) => setPoId(v === '__none__' ? '' : (v ?? ''))}>
                <SelectTrigger><SelectValue placeholder="Select PO…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {vendorPos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.po_number ?? `PO ${p.id.slice(0, 8)}`} · {p.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={createPo} disabled={creating} className="shrink-0">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'New PO'}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2, Phone, Mail, MapPin, Building2 } from 'lucide-react'

export interface Vendor {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  active: boolean
  created_at: string
}

const EMPTY: Omit<Vendor, 'id' | 'active' | 'created_at'> = {
  name: '', contact_name: '', email: '', phone: '', address: '', notes: '',
}

export default function VendorManager({ initialVendors }: { initialVendors: Vendor[] }) {
  const [vendors, setVendors] = useState(initialVendors)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (v: Vendor) => {
    setEditing(v)
    setForm({ name: v.name, contact_name: v.contact_name ?? '', email: v.email ?? '', phone: v.phone ?? '', address: v.address ?? '', notes: v.notes ?? '' })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vendor name is required'); return }
    setLoading(true)
    const payload = {
      name:         form.name.trim(),
      contact_name: form.contact_name || null,
      email:        form.email || null,
      phone:        form.phone || null,
      address:      form.address || null,
      notes:        form.notes || null,
    }
    if (editing) {
      const { error } = await supabase.from('vendors').update(payload).eq('id', editing.id)
      if (error) { toast.error('Failed to update vendor'); setLoading(false); return }
      setVendors((vs) => vs.map((v) => v.id === editing.id ? { ...v, ...payload } : v))
      toast.success('Vendor updated')
    } else {
      const { data, error } = await supabase.from('vendors').insert(payload).select().single()
      if (error || !data) { toast.error('Failed to add vendor'); setLoading(false); return }
      setVendors((vs) => [...vs, data as Vendor])
      toast.success('Vendor added')
    }
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  const handleToggleActive = async (v: Vendor) => {
    const { error } = await supabase.from('vendors').update({ active: !v.active }).eq('id', v.id)
    if (error) { toast.error('Failed to update'); return }
    setVendors((vs) => vs.map((x) => x.id === v.id ? { ...x, active: !v.active } : x))
    toast.success(v.active ? 'Vendor deactivated' : 'Vendor reactivated')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />Add Vendor
            </button>
          } />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input value={form.name} onChange={set('name')} placeholder="e.g. Pacific Metal" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input value={form.contact_name ?? ''} onChange={set('contact_name')} placeholder="Sales rep name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone ?? ''} onChange={set('phone')} placeholder="(555) 000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email ?? ''} onChange={set('email')} placeholder="orders@..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address ?? ''} onChange={set('address')} placeholder="Street address" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={form.notes ?? ''} onChange={set('notes')} placeholder="Lead times, minimums, etc." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Vendor'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((v) => (
          <Card key={v.id} className={`p-4 space-y-3 ${!v.active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{v.name}</p>
                  {!v.active && <Badge variant="secondary" className="text-[10px] mt-0.5">Inactive</Badge>}
                </div>
              </div>
              <button
                onClick={() => openEdit(v)}
                className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              {v.contact_name && <p className="font-medium text-foreground">{v.contact_name}</p>}
              {v.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3" />{v.phone}
                </p>
              )}
              {v.email && (
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />{v.email}
                </p>
              )}
              {v.address && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />{v.address}
                </p>
              )}
              {v.notes && <p className="italic">{v.notes}</p>}
            </div>

            <div className="pt-1 flex items-center justify-between">
              <a href={`/dashboard/purchase-orders?vendor=${v.id}`} className="text-xs text-primary hover:underline">
                View POs
              </a>
              <button
                onClick={() => handleToggleActive(v)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {v.active ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

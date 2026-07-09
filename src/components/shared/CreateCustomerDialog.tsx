'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { UserPlus, Loader2 } from 'lucide-react'

// Create a customer: walk-in (no login, via the staff_create_customer RPC) or a
// real login account (via the /api/staff/customers service-role route).
export default function CreateCustomerDialog({
  onCreated,
  triggerLabel = 'New Customer',
  triggerClassName,
}: {
  onCreated?: (customer: { id: string; name: string }) => void
  triggerLabel?: string
  triggerClassName?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '' })
  const [makeAccount, setMakeAccount] = useState(false)

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }))

  const displayName =
    [f.first_name, f.last_name].filter(Boolean).join(' ') || f.company_name || f.email || 'Customer'

  const submit = async () => {
    if (!f.first_name && !f.last_name && !f.company_name && !f.email) {
      toast.error('Enter at least a name, company, or email')
      return
    }
    if (makeAccount && !f.email) { toast.error('Email is required for a login account'); return }
    setSaving(true)
    let newId: string | null = null

    if (makeAccount) {
      const res = await fetch('/api/staff/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Failed to create account'); setSaving(false); return }
      newId = json.id ?? null
    } else {
      const { data, error } = await supabase.rpc('staff_create_customer', {
        p_first: f.first_name,
        p_last: f.last_name,
        p_email: f.email,
        p_phone: f.phone,
        p_company: f.company_name,
      })
      if (error) { toast.error(error.message); setSaving(false); return }
      newId = (data as string) ?? null
    }

    toast.success(makeAccount ? 'Customer account created' : 'Customer created')
    setOpen(false)
    setF({ first_name: '', last_name: '', email: '', phone: '', company_name: '' })
    setMakeAccount(false)
    setSaving(false)
    if (newId) onCreated?.({ id: newId, name: displayName })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className={triggerClassName ?? 'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors'}>
          <UserPlus className="w-4 h-4" />{triggerLabel}
        </button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>First name</Label>
            <Input value={f.first_name} onChange={set('first_name')} />
          </div>
          <div className="space-y-1.5">
            <Label>Last name</Label>
            <Input value={f.last_name} onChange={set('last_name')} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Company</Label>
            <Input value={f.company_name} onChange={set('company_name')} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Email{makeAccount ? ' *' : ''}</Label>
            <Input type="email" value={f.email} onChange={set('email')} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={f.phone} onChange={set('phone')} placeholder="Optional" />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm mt-1">
            <input type="checkbox" checked={makeAccount} onChange={(e) => setMakeAccount(e.target.checked)} />
            Create a login account (customer can sign in and see their orders)
          </label>
          {makeAccount && (
            <p className="col-span-2 text-xs text-muted-foreground">
              The customer sets their password later via &ldquo;forgot password.&rdquo;
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

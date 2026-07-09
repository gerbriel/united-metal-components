'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { UserPlus, Loader2 } from 'lucide-react'

// Admin-only: create a new user of any role with a login account. The API route
// (/api/admin/users) enforces admin and emails a set-password link, exactly like
// the customer-onboarding flow.
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'customer',           label: 'Customer' },
  { value: 'office_employee',    label: 'Office Employee' },
  { value: 'warehouse_employee', label: 'Warehouse Employee' },
  { value: 'admin',              label: 'Admin' },
]

const empty = { first_name: '', last_name: '', email: '', phone: '', company_name: '', role: 'customer' }

export default function CreateUserDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState(empty)

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }))

  const submit = async () => {
    if (!f.email.trim()) { toast.error('Email is required'); return }
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to create user'); return }

    toast[json.emailed ? 'success' : 'warning'](
      json.emailed
        ? `User created — a set-password link was emailed to ${f.email}`
        : 'User created, but the set-password email could not be sent (email rate limit). They can use “forgot password.”',
    )
    setOpen(false)
    setF(empty)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors">
          <UserPlus className="w-4 h-4" />New User
        </button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
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
            <Label>Email *</Label>
            <Input type="email" value={f.email} onChange={set('email')} placeholder="name@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={f.phone} onChange={set('phone')} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={f.role} onValueChange={(v) => v && setF((s) => ({ ...s, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Company</Label>
            <Input value={f.company_name} onChange={set('company_name')} placeholder="Optional" />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            We&apos;ll email {f.email || 'the user'} a link to set their own password. The account works right
            away — they don&apos;t need to set it first.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

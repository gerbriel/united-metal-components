'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, ShieldOff, ShieldCheck, Trash2, Pencil } from 'lucide-react'
import { tiersForType, tierLabelMap, type PricingTier } from '@/lib/pricing-tiers'
import CreateUserDialog from '@/components/shared/CreateUserDialog'

interface UserRow {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  company_name: string | null
  phone: string | null
  role: string
  employee_role: string | null
  account_status: string
  suspended_reason: string | null
  can_receive_inventory: boolean
  pricing_tier: string | null
  customer_type: 'retail' | 'contractor' | 'ag' | null
  created_at: string
}

interface Props { initialUsers: UserRow[]; tiers: PricingTier[]; currentUserId: string }

const ROLE_LABELS: Record<string, string> = {
  customer:           'Customer',
  office_employee:    'Office Employee',
  warehouse_employee: 'Warehouse Employee',
  admin:              'Admin',
}

const EMPLOYEE_ROLES = ['none', 'office', 'warehouse']

type Patch = Partial<{
  role: string | null
  employee_role: string | null
  account_status: string | null
  suspended_reason: string | null
  can_receive_inventory: boolean | null
  pricing_tier: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
  company_name: string | null
  phone: string | null
}>

export default function AdminUserManager({ initialUsers, tiers, currentUserId }: Props) {
  const [users, setUsers]           = useState<UserRow[]>(initialUsers)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const tierLabels = tierLabelMap(tiers)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [loadingId, setLoadingId]   = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, company_name, phone, role, employee_role, account_status, suspended_reason, can_receive_inventory, pricing_tier, customer_type, created_at')
      .order('created_at', { ascending: false })
    if (data) setUsers(data as UserRow[])
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('admin-profiles-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, fetchUsers)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchUsers])

  const callRpc = async (userId: string, patch: Patch) => {
    setLoadingId(userId)
    // Build args only for keys present in patch — avoids calling with params
    // that don't exist in older DB function versions (pre-migration 009/010).
    const args: Record<string, unknown> = { p_user_id: userId }
    if ('role' in patch)             args.p_role             = patch.role ?? null
    if ('employee_role' in patch)    args.p_employee_role    = patch.employee_role ?? null
    if ('account_status' in patch)   args.p_account_status   = patch.account_status ?? null
    if ('suspended_reason' in patch) args.p_suspended_reason = patch.suspended_reason ?? null
    if ('can_receive_inventory' in patch) {
      args.p_can_receive_inventory = patch.can_receive_inventory != null
        ? Boolean(patch.can_receive_inventory)
        : null
    }
    if ('pricing_tier' in patch) args.p_pricing_tier = patch.pricing_tier ?? null
    if ('full_name' in patch)    args.p_full_name    = patch.full_name ?? null
    if ('first_name' in patch)   args.p_first_name   = patch.first_name ?? null
    if ('last_name' in patch)    args.p_last_name    = patch.last_name ?? null
    if ('company_name' in patch) args.p_company_name = patch.company_name ?? null
    if ('phone' in patch)        args.p_phone        = patch.phone ?? null

    const { error } = await supabase.rpc('admin_update_user_profile', args)
    if (error) toast.error(`Failed: ${error.message}`)
    else { toast.success('Updated'); await fetchUsers() }
    setLoadingId(null)
  }

  const handleRoleChange = (userId: string, newRole: string) =>
    callRpc(userId, { role: newRole, employee_role: null })

  const handleEmployeeRoleChange = (userId: string, newEmpRole: string) =>
    callRpc(userId, { role: null, employee_role: newEmpRole === 'none' ? '' : newEmpRole })

  const handleSuspend = async (userId: string) => {
    if (!suspendReason.trim()) { toast.error('Please provide a reason'); return }
    await callRpc(userId, { account_status: 'suspended', suspended_reason: suspendReason })
    setSuspendingId(null)
    setSuspendReason('')
  }

  const handleUnsuspend = (userId: string) =>
    callRpc(userId, { account_status: 'active', suspended_reason: null })

  // Contact-info editing (name / company / phone).
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', company_name: '', phone: '' })

  const openEdit = (u: UserRow) => {
    setEditForm({
      first_name:   u.first_name ?? '',
      last_name:    u.last_name ?? '',
      company_name: u.company_name ?? '',
      phone:        u.phone ?? '',
    })
    setEditUser(u)
  }

  const saveEdit = async () => {
    if (!editUser) return
    const first = editForm.first_name.trim()
    const last  = editForm.last_name.trim()
    const patch: Patch = {
      first_name:   first,
      last_name:    last,
      company_name: editForm.company_name.trim(),
      phone:        editForm.phone.trim(),
    }
    // Keep the full_name display in sync when a first/last name is provided.
    if (first || last) patch.full_name = [first, last].filter(Boolean).join(' ')
    const target = editUser
    setEditUser(null)
    await callRpc(target.id, patch)
  }

  const handleDelete = async (u: UserRow) => {
    const label = u.first_name && u.last_name
      ? `${u.first_name} ${u.last_name}`
      : u.full_name ?? u.company_name ?? 'this user'
    if (!confirm(`Delete ${label}? This permanently removes their account and can't be undone.`)) return
    setDeletingId(u.id)
    const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    setDeletingId(null)
    if (!res.ok) { toast.error(json.error ?? 'Failed to delete user'); return }
    toast.success('User deleted')
    await fetchUsers()
  }

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return [u.full_name, u.first_name, u.last_name, u.company_name, u.phone, u.role]
      .some((v) => v?.toLowerCase().includes(q))
  })

  const isStaffRole = (role: string) =>
    ['employee', 'office_employee', 'warehouse_employee', 'admin'].includes(role)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search by name, company, phone, or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <CreateUserDialog />
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {users.length} users</p>

      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Employee Type</th>
                <th className="text-left p-3">Receiving</th>
                <th className="text-left p-3">Pricing Tier</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => {
                const name = u.first_name && u.last_name
                  ? `${u.first_name} ${u.last_name}`
                  : u.full_name ?? 'Unnamed'
                const isBusy = loadingId === u.id
                const isSuspended = u.account_status === 'suspended'
                const showingReason = suspendingId === u.id

                return (
                  <tr key={u.id} className={`${isSuspended ? 'bg-red-50/40' : 'bg-white'} hover:bg-slate-50 transition-colors`}>
                    <td className="p-3">
                      <p className="font-medium">{name}</p>
                      {u.company_name && <p className="text-xs text-muted-foreground">{u.company_name}</p>}
                      {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                      <div className="flex items-center gap-1.5 mt-1">
                        {u.customer_type && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            u.customer_type === 'contractor'
                              ? 'bg-orange-100 text-orange-700'
                              : u.customer_type === 'ag'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {u.customer_type === 'contractor' ? 'Contractor'
                              : u.customer_type === 'ag' ? 'Agricultural'
                              : 'One-off Customer'}
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                    </td>

                    <td className="p-3">
                      <Select
                        value={u.role}
                        onValueChange={(v) => v && handleRoleChange(u.id, v)}
                        disabled={isBusy}
                      >
                        <SelectTrigger className="w-44 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="p-3">
                      {isStaffRole(u.role) ? (
                        <Select
                          value={u.employee_role ?? 'none'}
                          onValueChange={(v) => v && handleEmployeeRoleChange(u.id, v)}
                          disabled={isBusy}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYEE_ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="capitalize">{r === 'none' ? '— none —' : r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>

                    <td className="p-3">
                      {isStaffRole(u.role) ? (
                        <button
                          disabled={isBusy}
                          onClick={() => callRpc(u.id, { can_receive_inventory: !u.can_receive_inventory })}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            u.can_receive_inventory
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {u.can_receive_inventory ? 'Enabled' : 'Off'}
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>

                    <td className="p-3">
                      {!isStaffRole(u.role) ? (() => {
                        // Offer the tiers for the customer's account type; when the
                        // type is unset, offer all active tiers. Always include the
                        // current value so a stale/inactive tier stays visible.
                        const options = u.customer_type
                          ? tiersForType(tiers, u.customer_type)
                          : tiers.filter((t) => t.active !== false)
                        const current = u.pricing_tier
                        const showCurrent = current && !options.some((o) => o.value === current)
                        return (
                          <Select
                            value={current ?? '__unset__'}
                            onValueChange={(v) => v && callRpc(u.id, {
                              pricing_tier: v === '__unset__' ? '__clear__' : v,
                            })}
                            disabled={isBusy}
                          >
                            <SelectTrigger className="w-52 h-8 text-xs">
                              <SelectValue placeholder="— unassigned —" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unset__" className="text-muted-foreground">— unassigned —</SelectItem>
                              {showCurrent && (
                                <SelectItem value={current}>{tierLabels[current] ?? current} (mismatch)</SelectItem>
                              )}
                              {options.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      })() : <span className="text-muted-foreground text-xs">—</span>}
                    </td>

                    <td className="p-3">
                      {isSuspended ? (
                        <div>
                          <Badge className="bg-red-100 text-red-700 border-red-200 border">Suspended</Badge>
                          {u.suspended_reason && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[160px] truncate" title={u.suspended_reason}>
                              {u.suspended_reason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-green-200 border">Active</Badge>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : isSuspended ? (
                          <Button
                            size="sm" variant="outline"
                            onClick={() => handleUnsuspend(u.id)}
                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />Reinstate
                          </Button>
                        ) : showingReason ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={suspendReason}
                              onChange={(e) => setSuspendReason(e.target.value)}
                              placeholder="Reason…"
                              className="h-7 text-xs w-36"
                              onKeyDown={(e) => e.key === 'Enter' && handleSuspend(u.id)}
                            />
                            <Button size="sm" onClick={() => handleSuspend(u.id)} className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white border-0">
                              Confirm
                            </Button>
                            <button onClick={() => { setSuspendingId(null); setSuspendReason('') }} className="text-xs text-muted-foreground hover:text-foreground">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm" variant="outline"
                            onClick={() => setSuspendingId(u.id)}
                            className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                          >
                            <ShieldOff className="w-3.5 h-3.5 mr-1" />Suspend
                          </Button>
                        )}
                        {/* Edit contact info */}
                        {!showingReason && (
                          <button
                            onClick={() => openEdit(u)}
                            title="Edit contact info"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Permanent delete — hidden for your own account. */}
                        {u.id !== currentUserId && !showingReason && (
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={deletingId === u.id}
                            title="Delete user"
                            className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-40"
                          >
                            {deletingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit contact info */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit contact info</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First name</Label>
                <Input value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={editForm.company_name} onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={loadingId === editUser?.id}>Save changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

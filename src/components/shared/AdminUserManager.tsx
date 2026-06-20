'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, ShieldOff, ShieldCheck } from 'lucide-react'

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
  created_at: string
}

interface Props { initialUsers: UserRow[] }

const ROLE_LABELS: Record<string, string> = {
  customer:          'Customer',
  employee:          'Employee (legacy)',
  office_employee:   'Office Employee',
  warehouse_employee:'Warehouse Employee',
  admin:             'Admin',
}

const EMPLOYEE_ROLES = ['none', 'office', 'warehouse']

export default function AdminUserManager({ initialUsers }: Props) {
  const [users, setUsers]           = useState<UserRow[]>(initialUsers)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [loadingId, setLoadingId]   = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, company_name, phone, role, employee_role, account_status, suspended_reason, can_receive_inventory, created_at')
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

  const callRpc = async (userId: string, patch: Record<string, string | boolean | null>) => {
    setLoadingId(userId)
    const { error } = await supabase.rpc('admin_update_user_profile', {
      p_user_id:               userId,
      p_role:                  patch.role                    ?? null,
      p_employee_role:         patch.employee_role           ?? null,
      p_account_status:        patch.account_status          ?? null,
      p_suspended_reason:      patch.suspended_reason        ?? null,
      p_can_receive_inventory: patch.can_receive_inventory != null
        ? Boolean(patch.can_receive_inventory)
        : null,
    })
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
      <Input
        placeholder="Search by name, company, phone, or role…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
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
                      <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
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
                          onClick={() => callRpc(u.id, {
                            role: null, employee_role: null, account_status: null, suspended_reason: null,
                            can_receive_inventory: !u.can_receive_inventory,
                          })}
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

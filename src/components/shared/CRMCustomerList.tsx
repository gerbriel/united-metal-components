'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Link from 'next/link'
import { Search } from 'lucide-react'

interface CustomerOrder {
  id: number
  total: number
  status: string
}

interface Customer {
  id: string
  full_name: string | null
  company_name: string | null
  phone: string | null
  created_at: string
  orders: CustomerOrder[]
}

interface Props {
  customers: Customer[]
  isAdmin: boolean
}

export default function CRMCustomerList({ customers, isAdmin }: Props) {
  const [search, setSearch]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (search) {
        const q = search.toLowerCase()
        const ok = [c.full_name, c.company_name, c.phone]
          .some((v) => v?.toLowerCase().includes(q))
        if (!ok) return false
      }
      if (dateFrom && new Date(c.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(c.created_at) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [customers, search, dateFrom, dateTo])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search name, company, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Joined</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 text-sm h-9" />
          <span className="text-muted-foreground">—</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 text-sm h-9" />
          {(dateFrom || dateTo || search) && (
            <button
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}
              className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {customers.length} customers
      </p>

      <div className="grid gap-3">
        {filtered.map((c) => {
          const orders = c.orders ?? []
          const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
          const initials = c.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
          return (
            <Link key={c.id} href={`/dashboard/crm/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{c.full_name ?? 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.company_name ? `${c.company_name} · ` : ''}{c.phone ?? 'No phone'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {isAdmin && <p className="text-sm font-bold text-primary">${totalRevenue.toFixed(2)}</p>}
                    <p className="text-xs text-muted-foreground">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Since</p>
                    <p className="text-xs">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No customers match your filters.</p>
        )}
      </div>
    </div>
  )
}

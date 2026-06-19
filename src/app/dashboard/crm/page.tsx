export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CRM — Dashboard' }

export default async function CRMPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('profiles')
    .select('*, orders(id, total, status)')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CRM — Customers</h1>
        <p className="text-sm text-muted-foreground">{customers?.length ?? 0} customers</p>
      </div>

      <div className="grid gap-3">
        {customers?.map((c) => {
          const orders = (c.orders as any[]) ?? []
          const totalRevenue = orders.reduce((sum: number, o: any) => sum + o.total, 0)
          const initials = c.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
          return (
            <Link key={c.id} href={`/dashboard/crm/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{c.full_name ?? 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground">{c.company ? `${c.company} · ` : ''}{c.phone ?? 'No phone'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">${totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{orders.length} order(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Since</p>
                    <p className="text-xs">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

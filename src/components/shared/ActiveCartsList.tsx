import Link from 'next/link'

export interface CartSnapshotItem {
  name?: string
  quantity?: number
  color?: string | null
}

export interface ActiveCart {
  session_id: string
  user_id: string | null
  item_count: number
  items: CartSnapshotItem[]
  updated_at: string
  profiles?: { full_name: string | null; company_name: string | null } | null
}

// Read-only overview of carts with items in them (staff-readable via RLS).
// Logged-in shoppers link to their CRM record; guests show as "Guest".
export default function ActiveCartsList({ carts }: { carts: ActiveCart[] }) {
  if (carts.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No active carts right now.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
          <tr>
            <th className="text-left p-3">Shopper</th>
            <th className="text-left p-3">Items</th>
            <th className="text-right p-3">Count</th>
            <th className="text-right p-3">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {carts.map((c) => {
            const name = c.profiles?.full_name || c.profiles?.company_name
            const summary = (c.items ?? [])
              .map((i) => `${i.quantity ?? 1}× ${i.name ?? 'Item'}${i.color ? ` (${i.color})` : ''}`)
              .join(', ')
            return (
              <tr key={c.session_id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3">
                  {c.user_id ? (
                    <Link href={`/dashboard/crm/${c.user_id}`} className="font-medium text-primary hover:underline">
                      {name ?? 'Customer'}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Guest</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground max-w-[420px] truncate" title={summary}>{summary || '—'}</td>
                <td className="p-3 text-right font-mono">{c.item_count}</td>
                <td className="p-3 text-right text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleString()}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

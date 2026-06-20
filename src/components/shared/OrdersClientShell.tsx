'use client'

import { useState, useCallback } from 'react'
import RealtimeOrdersList, { type OrderRow } from './RealtimeOrdersList'
import ExportCompletedOrdersButton from './ExportCompletedOrdersButton'
import { X, Search } from 'lucide-react'

interface Props {
  initialOrders: OrderRow[]
  isWarehouse: boolean
  isAdmin: boolean
  currentStatus?: string
}

const TIER_OPTIONS = [
  { value: 'retail',                    label: 'Retail' },
  { value: 'retail_tax_exempt',         label: 'Tax Exempt (Retail)' },
  { value: 'contractor',                label: 'Contractor' },
  { value: 'contractor_tax_exempt_tbd', label: 'Tax Exempt Pending' },
  { value: 'contractor_tax_exempt',     label: 'Tax Exempt' },
  { value: '__unassigned__',            label: 'Unassigned' },
]

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'oldest',     label: 'Oldest first' },
  { value: 'total_desc', label: 'Highest total' },
  { value: 'total_asc',  label: 'Lowest total' },
  { value: 'items_desc', label: 'Most items' },
]

export default function OrdersClientShell({ initialOrders, isWarehouse, isAdmin, currentStatus }: Props) {
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')
  const [selectedTiers,  setSelectedTiers]  = useState<string[]>([])
  const [searchQuery,    setSearchQuery]    = useState('')
  const [sortBy,         setSortBy]         = useState('newest')
  const [ordersForStats, setOrdersForStats] = useState<OrderRow[]>(initialOrders)

  const handleOrdersChange = useCallback((orders: OrderRow[]) => {
    setOrdersForStats(orders)
  }, [])

  const toggleTier = (v: string) =>
    setSelectedTiers((prev) => prev.includes(v) ? prev.filter((t) => t !== v) : [...prev, v])

  const clearDates = () => { setDateFrom(''); setDateTo('') }

  // Admin revenue stats from current filtered view
  const completedOrders    = ordersForStats.filter((o) => o.status === 'completed')
  const completedStandard  = completedOrders.filter((o) => (o.profiles as any)?.pricing_tier !== 'contractor_tax_exempt_tbd')
  const completedTbd       = completedOrders.filter((o) => (o.profiles as any)?.pricing_tier === 'contractor_tax_exempt_tbd')
  const revenueStandard    = completedStandard.reduce((s, o) => s + (o.total ?? 0), 0)
  const revenueTbd         = completedTbd.reduce((s, o) => s + (o.total ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Admin revenue stats */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xl font-bold">{ordersForStats.length}</p>
            <p className="text-xs text-muted-foreground">Orders in view</p>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xl font-bold">{completedOrders.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xl font-bold text-primary">${revenueStandard.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground">Revenue (standard)</p>
          </div>
          <div className="bg-white border border-amber-200 rounded-lg p-3">
            <p className="text-xl font-bold text-amber-700">${revenueTbd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground">Revenue (TBD tax exempt)</p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, order #, or phone…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border rounded-md pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border">
        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
            className="border rounded-md px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            className="border rounded-md px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {(dateFrom || dateTo) && (
            <button onClick={clearDates} className="text-muted-foreground hover:text-foreground transition-colors" title="Clear dates">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border rounded-md px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SORT_OPTIONS.filter((o) => {
            if (isWarehouse && (o.value === 'total_desc' || o.value === 'total_asc')) return false
            return true
          }).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Pricing tier chips — admin only */}
        {isAdmin && (
          <div className="flex flex-wrap gap-1.5">
            {TIER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleTier(opt.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedTiers.includes(opt.value)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {selectedTiers.length > 0 && (
              <button
                onClick={() => setSelectedTiers([])}
                className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div className="ml-auto">
          {!isWarehouse && !selectedTiers.includes('contractor_tax_exempt_tbd') && (
            <ExportCompletedOrdersButton
              isAdmin={isAdmin}
              dateFrom={dateFrom || null}
              dateTo={dateTo || null}
              customerTypes={selectedTiers.length > 0 ? selectedTiers : undefined}
            />
          )}
        </div>
      </div>

      <RealtimeOrdersList
        initialOrders={initialOrders}
        isWarehouse={isWarehouse}
        isAdmin={isAdmin}
        currentStatus={currentStatus}
        dateFrom={dateFrom || null}
        dateTo={dateTo || null}
        customerTypes={selectedTiers.length > 0 ? selectedTiers : undefined}
        searchQuery={searchQuery}
        sortBy={sortBy}
        onOrdersChange={handleOrdersChange}
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import RealtimeOrdersList from './RealtimeOrdersList'
import ExportCompletedOrdersButton from './ExportCompletedOrdersButton'
import { X } from 'lucide-react'

interface OrderRow {
  id: number
  status: string
  total: number
  created_at: string
  profiles: { first_name: string | null; last_name: string | null; full_name: string | null; phone: string | null; pricing_tier: string | null } | null
  order_items: { id: number }[]
}

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

export default function OrdersClientShell({ initialOrders, isWarehouse, isAdmin, currentStatus }: Props) {
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])

  const toggleTier = (v: string) =>
    setSelectedTiers((prev) => prev.includes(v) ? prev.filter((t) => t !== v) : [...prev, v])

  const clearDates = () => { setDateFrom(''); setDateTo('') }

  const activeFilters = dateFrom || dateTo || selectedTiers.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border">
        {/* Date range */}
        <div className="flex items-center gap-1.5 text-sm">
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
            <button
              onClick={clearDates}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Clear dates"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

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
          {!isWarehouse && (
            <ExportCompletedOrdersButton
              isAdmin={isAdmin}
              dateFrom={dateFrom || null}
              dateTo={dateTo || null}
              customerTypes={selectedTiers.length > 0 ? selectedTiers : undefined}
            />
          )}
        </div>
      </div>

      {activeFilters && (
        <p className="text-xs text-muted-foreground">
          Filters active
          {dateFrom && ` · from ${new Date(dateFrom).toLocaleDateString('en-US', { timeZone: 'UTC' })}`}
          {dateTo && ` · to ${new Date(dateTo).toLocaleDateString('en-US', { timeZone: 'UTC' })}`}
          {selectedTiers.length > 0 && ` · ${selectedTiers.length} tier${selectedTiers.length > 1 ? 's' : ''} selected`}
        </p>
      )}

      <RealtimeOrdersList
        initialOrders={initialOrders}
        isWarehouse={isWarehouse}
        isAdmin={isAdmin}
        currentStatus={currentStatus}
        dateFrom={dateFrom || null}
        dateTo={dateTo || null}
        customerTypes={selectedTiers.length > 0 ? selectedTiers : undefined}
      />
    </div>
  )
}

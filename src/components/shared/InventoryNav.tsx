'use client'

import Link from 'next/link'
import { Package, Layers, Cylinder, PackageOpen, Truck, CheckSquare, FileText } from 'lucide-react'

// Trim and Hat/Brace are managed from the Products category views (Trim / Bracing),
// so they're intentionally NOT top-level tabs — their per-color / per-length stock
// managers are reached via each product's "Manage" link there.
const TABS = [
  { key: 'products',   href: '/dashboard/inventory',             label: 'Products',   icon: Package     },
  { key: 'coils',      href: '/dashboard/inventory/coils',       label: 'Coils',      icon: Layers      },
  { key: 'tubes',      href: '/dashboard/inventory/tubes',       label: 'Tubes',      icon: Cylinder    },
  { key: 'overstock',  href: '/dashboard/inventory/overstock',   label: 'Overstock',  icon: PackageOpen },
  { key: 'receiving',  href: '/dashboard/inventory/receiving',   label: 'Receiving',  icon: Truck       },
  { key: 'astm',       href: '/dashboard/inventory/astm',        label: 'ASTM',       icon: FileText    },
  { key: 'approvals',  href: '/dashboard/inventory/approvals',   label: 'Approvals',  icon: CheckSquare },
]

// 'trim' and 'hat-brace' stay in the union so their (now nav-hidden) manager pages
// still typecheck; those tools are reached from the Products category views instead.
type ActiveTab = 'products' | 'coils' | 'tubes' | 'overstock' | 'trim' | 'hat-brace' | 'receiving' | 'astm' | 'approvals'

export default function InventoryNav({ active }: { active: ActiveTab }) {
  return (
    <div className="flex items-center gap-1 border-b">
      {TABS.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </Link>
      ))}
    </div>
  )
}

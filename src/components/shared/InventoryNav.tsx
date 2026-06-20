'use client'

import Link from 'next/link'
import { Package, Layers, Cylinder, Truck, CheckSquare } from 'lucide-react'

const TABS = [
  { key: 'products',   href: '/dashboard/inventory',             label: 'Products',   icon: Package     },
  { key: 'coils',      href: '/dashboard/inventory/coils',       label: 'Coils',      icon: Layers      },
  { key: 'tubes',      href: '/dashboard/inventory/tubes',       label: 'Tubes',      icon: Cylinder    },
  { key: 'receiving',  href: '/dashboard/inventory/receiving',   label: 'Receiving',  icon: Truck       },
  { key: 'approvals',  href: '/dashboard/inventory/approvals',   label: 'Approvals',  icon: CheckSquare },
]

type ActiveTab = 'products' | 'coils' | 'tubes' | 'receiving' | 'approvals'

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

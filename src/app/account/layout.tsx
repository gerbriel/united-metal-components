import Link from 'next/link'
import { User, Package, Bell, Settings } from 'lucide-react'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'

const navItems = [
  { href: '/account', label: 'Dashboard', icon: User },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
  { href: '/account/settings', label: 'Settings', icon: Settings },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="md:w-56 shrink-0">
            <nav className="space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Icon className="w-4 h-4" />{label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <PublicFooter />
    </>
  )
}

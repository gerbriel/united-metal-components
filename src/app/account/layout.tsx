import Link from 'next/link'
import { User, Package, Settings } from 'lucide-react'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import NotificationBell from '@/components/shared/NotificationBell'
import { createClient } from '@/lib/supabase/server'
import { STAFF_ROLES } from '@/types/database'

const NAV_CLS = 'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors whitespace-nowrap'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isEmployee = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isEmployee = !!profile && STAFF_ROLES.includes((profile as any).role)
  }

  return (
    <>
      <PublicHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Mobile: horizontal scrollable nav */}
          <aside className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              <Link href="/account" className={NAV_CLS}>
                <User className="w-4 h-4" />Dashboard
              </Link>
              {!isEmployee && (
                <Link href="/account/orders" className={NAV_CLS}>
                  <Package className="w-4 h-4" />My Orders
                </Link>
              )}
              <Link href="/account/settings" className={NAV_CLS}>
                <Settings className="w-4 h-4" />Settings
              </Link>
              <NotificationBell
                href="/account/notifications"
                label="Notifications"
                className={NAV_CLS}
                iconClassName="w-4 h-4"
              />
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <PublicFooter />
    </>
  )
}

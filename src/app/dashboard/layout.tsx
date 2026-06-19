import Link from 'next/link'
import { Package, LayoutDashboard, ClipboardList, Users, BarChart3, Mail, Share2, Bell, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSignOut from '@/components/shared/DashboardSignOut'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/orders', label: 'Orders', icon: ClipboardList },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard/crm', label: 'CRM', icon: Users },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/dashboard/social', label: 'Social Posts', icon: Share2 },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || !['employee', 'admin'].includes(profile.role)) redirect('/')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-sidebar-primary rounded flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-sidebar-foreground leading-tight">United Metal</p>
              <p className="text-xs text-sidebar-primary">Dashboard</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-sidebar-foreground">{profile.full_name}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{profile.role}</p>
          </div>
          <DashboardSignOut />
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}

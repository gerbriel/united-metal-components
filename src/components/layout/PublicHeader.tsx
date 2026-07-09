'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { ShoppingCart, Menu, X, User, LogOut, LayoutDashboard, Package, Tag } from 'lucide-react'
import { iconFor, type NavCategory } from '@/lib/nav-categories'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useCartStore } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/database'
import CartDrawer from '@/components/shared/CartDrawer'
import GlobalSearch, { type ProductSearchItem } from '@/components/layout/GlobalSearch'
import NotificationBell from '@/components/shared/NotificationBell'
import { cn } from '@/lib/utils'

// Product buckets render in the DB-driven category bar (see `categories` prop);
// these are the remaining flat top-level links.
const navLinks = [
  { href: '/contact', label: 'Contact' },
]

export default function PublicHeader({ categories, products = [] }: { categories: NavCategory[]; products?: ProductSearchItem[] }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const itemCount = useCartStore((s) => s.itemCount())
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data as Profile)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!session) { setProfile(null); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data as Profile)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const STAFF_ROLES = ['employee', 'office_employee', 'warehouse_employee', 'admin']
  const isStaff = profile && STAFF_ROLES.includes(profile.role)

  return (
    <>
      <header className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm'
          : 'bg-white border-b border-slate-100'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <img
                src="/logo/UMC-logo-horizontal.svg"
                alt="United Metal Components"
                className="h-10 w-auto"
              />
            </Link>

            {/* Actions — search sits next to Contact (grows to fill toward the logo) */}
            <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
              {/* Global search — inline next to Contact on desktop; sort/filter
                  render beside it only on the products page (see GlobalSearch) */}
              <Suspense fallback={null}>
                <GlobalSearch className="hidden md:flex flex-1 max-w-md min-w-0 mr-1" products={products} />
              </Suspense>
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="hidden md:inline-flex px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors shrink-0"
                >
                  {l.label}
                </Link>
              ))}
              {/* Notifications — sits beside the cart for signed-in users (needs a
                  user to count against; anonymous visitors have no notifications) */}
              {profile && (
                <NotificationBell
                  href="/account/notifications"
                  className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
                  iconClassName="w-5 h-5"
                />
              )}

              {/* Cart */}
              <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)}>
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {itemCount}
                  </span>
                )}
              </Button>

              {/* Auth */}
              {profile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ml-1">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-white text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                    </button>
                  } />
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{profile.full_name ?? 'Account'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link href="/account" className="flex items-center w-full">
                        <User className="w-4 h-4 mr-2" />My Account
                      </Link>
                    </DropdownMenuItem>
                    {!isStaff && (
                      <DropdownMenuItem>
                        <Link href="/account/orders" className="flex items-center w-full">
                          <Package className="w-4 h-4 mr-2" />My Orders
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isStaff && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Link href="/dashboard/orders" className="flex items-center w-full">
                            <LayoutDashboard className="w-4 h-4 mr-2" />Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/dashboard/inventory" className="flex items-center w-full">
                            <Package className="w-4 h-4 mr-2" />Inventory
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 ml-1">
                  <ButtonLink href="/login" variant="ghost" size="sm" className="text-slate-600">
                    Sign In
                  </ButtonLink>
                  <ButtonLink
                    href="/signup"
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-sm"
                  >
                    Get Started
                  </ButtonLink>
                </div>
              )}

              {/* Mobile menu toggle */}
              <Button variant="ghost" size="icon" className="md:hidden ml-1" onClick={() => setMobileOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Global search — dedicated row on mobile/tablet (inline one is md+) */}
        <div className="md:hidden border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <Suspense fallback={null}>
              <GlobalSearch products={products} onSubmitted={() => setMobileOpen(false)} />
            </Suspense>
          </div>
        </div>

        {/* Category bar — mirrors the /products sidebar options */}
        <div className="hidden md:block border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-0.5 h-11 overflow-x-auto no-scrollbar">
              <Link
                href="/products"
                className="shrink-0 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:text-primary transition-colors"
              >
                All Products
              </Link>
              <span className="shrink-0 w-px h-4 bg-slate-200 mx-1.5" />
              {categories.map((c) => {
                const Icon = iconFor(c.icon)
                return (
                  <Link
                    key={c.slug}
                    href={`/products?cat=${c.slug}`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {c.name}
                  </Link>
                )
              })}
              {/* Overstock — not a category; jumps straight to the overstock product */}
              <Link
                href="/overstock"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
              >
                <Tag className="w-3.5 h-3.5" />
                Overstock
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-72 bg-white shadow-2xl flex flex-col p-6">
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold text-primary text-lg">United Metal</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1">
              <Link
                href="/products"
                className="text-base font-semibold py-2.5 px-3 rounded-lg hover:bg-slate-50 hover:text-primary transition-colors text-slate-800"
                onClick={() => setMobileOpen(false)}
              >
                All Products
              </Link>
              {categories.map((c) => {
                const Icon = iconFor(c.icon)
                return (
                  <Link
                    key={c.slug}
                    href={`/products?cat=${c.slug}`}
                    className="flex items-center gap-2.5 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-primary transition-colors text-slate-600"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    {c.name}
                  </Link>
                )
              })}
              <Link
                href="/overstock"
                className="flex items-center gap-2.5 text-sm font-semibold py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-orange-700 transition-colors text-orange-600"
                onClick={() => setMobileOpen(false)}
              >
                <Tag className="w-4 h-4" />
                Overstock
              </Link>
              <div className="my-2 border-t border-slate-100" />
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-base font-medium py-2.5 px-3 rounded-lg hover:bg-slate-50 hover:text-primary transition-colors text-slate-700"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            {!profile && (
              <div className="flex flex-col gap-2 mt-auto pt-6 border-t border-slate-100">
                <ButtonLink href="/signup" className="bg-orange-500 hover:bg-orange-600 text-white border-0 justify-center">
                  Get Started
                </ButtonLink>
                <ButtonLink href="/login" variant="outline" className="justify-center">
                  Sign In
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}

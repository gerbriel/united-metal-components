'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ShoppingCart, Menu, X, Bell, User, LogOut, LayoutDashboard, Package } from 'lucide-react'
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

const navLinks = [
  { href: '/products', label: 'Products' },
  { href: '/products?cat=panels', label: 'Sheet Metal' },
  { href: '/products?cat=doors-hardware', label: 'Doors' },
  { href: '/products?cat=trusses', label: 'Trusses' },
  { href: '/contact', label: 'Contact' },
]

export default function PublicHeader() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const itemCount = useCartStore((s) => s.itemCount())
  const supabase = createClient()
  const router = useRouter()

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
  const isStaff = profile && ['employee', 'admin'].includes(profile.role)

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground leading-tight">
                United Metal<br className="hidden sm:block" />
                <span className="text-primary">Components</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Cart */}
              <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)}>
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
                    {itemCount}
                  </Badge>
                )}
              </Button>

              {/* Auth */}
              {profile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-white text-xs">{initials}</AvatarFallback>
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
                      <Link href="/account" className="flex items-center w-full"><User className="w-4 h-4 mr-2" />My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/account/orders" className="flex items-center w-full"><Package className="w-4 h-4 mr-2" />My Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/account/notifications" className="flex items-center w-full"><Bell className="w-4 h-4 mr-2" />Notifications</Link>
                    </DropdownMenuItem>
                    {isStaff && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Link href="/dashboard" className="flex items-center w-full"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Link>
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
                <div className="hidden sm:flex items-center gap-2">
                  <ButtonLink href="/login" variant="ghost" size="sm">Sign In</ButtonLink>
                  <ButtonLink href="/signup" size="sm">Create Account</ButtonLink>
                </div>
              )}

              {/* Mobile menu */}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-72 bg-white shadow-xl flex flex-col p-6 gap-6">
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary">United Metal</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-4">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="text-base font-medium hover:text-primary" onClick={() => setMobileOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </nav>
            {!profile && (
              <div className="flex flex-col gap-2 mt-auto">
                <ButtonLink href="/signup">Create Account</ButtonLink>
                <ButtonLink href="/login" variant="outline">Sign In</ButtonLink>
              </div>
            )}
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}

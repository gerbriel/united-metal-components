'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useCartStore, type CartItem } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'

// A snapshot of the client cart is persisted to the DB (via the sync_cart RPC,
// migrations 035/037) so office/admin CRM can see active carts, who's reached
// checkout, and send reminders. Invisible — mounted in the public layout.

const SESSION_KEY = 'umc-cart-session'

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function snapshot(items: CartItem[]) {
  return items.map((i) => ({
    productId: i.product.id,
    name: i.product.name,
    sku: i.product.sku,
    quantity: i.quantity,
    length: i.length ?? null,
    lengthIn: i.lengthIn ?? null,
    color: i.color ?? null,
    overstock: i.overstockId != null,
  }))
}

export default function CartSync() {
  const items = useCartStore((s) => s.items)
  const pathname = usePathname()
  const supabase = createClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The checkout route marks the cart as "checkout" stage; everywhere else it's
  // "active". Supabase builders are lazy — .then() actually fires the request.
  const push = (list: CartItem[], stage: string) => {
    const count = list.reduce((n, i) => n + i.quantity, 0)
    ;(supabase.rpc as unknown as (fn: string, args: unknown) => PromiseLike<{ error: unknown }>)(
      'sync_cart',
      { p_session_id: getSessionId(), p_items: snapshot(list), p_item_count: count, p_stage: stage },
    ).then(
      ({ error }) => { if (error) console.error('cart sync failed', error) },
      (err: unknown) => console.error('cart sync failed', err),
    )
  }

  // Debounced sync whenever the cart or route (browsing ↔ checkout) changes.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stage = pathname === '/checkout' ? 'checkout' : 'active'
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push(items, stage), 800)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [items, pathname])

  // Re-sync on sign-in/out so a guest cart attaches to (or detaches from) the user.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() =>
      push(useCartStore.getState().items, pathname === '/checkout' ? 'checkout' : 'active'),
    )
    return () => data.subscription.unsubscribe()
  }, [])

  return null
}

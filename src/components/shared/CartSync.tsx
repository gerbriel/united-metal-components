'use client'

import { useEffect, useRef } from 'react'
import { useCartStore, type CartItem } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'

// A snapshot of the client cart is persisted to the DB (via the sync_cart RPC,
// migration 035) so office/admin CRM can see active carts and send reminders.
// Invisible — mounted in the public layout like AnalyticsTracker.

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
  const supabase = createClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const push = (list: CartItem[]) => {
    const count = list.reduce((n, i) => n + i.quantity, 0)
    void (supabase.rpc as (fn: string, args: unknown) => Promise<unknown>)('sync_cart', {
      p_session_id: getSessionId(),
      p_items: snapshot(list),
      p_item_count: count,
    })
  }

  // Debounced sync whenever the cart changes.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push(items), 1000)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [items])

  // Re-sync on sign-in/out so a guest cart attaches to (or detaches from) the user.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => push(useCartStore.getState().items))
    return () => data.subscription.unsubscribe()
  }, [])

  return null
}

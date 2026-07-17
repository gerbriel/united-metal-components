import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types/database'
import { extendUnitPrice } from '@/lib/finishes'

export interface CartItem {
  product:  Product
  quantity: number
  length?:  number   // feet, for per-foot products
  lengthIn?: number  // extra inches (contractor custom only)
  color?:   string
  overstockId?: number // specific panel_overstock listing this line draws from
}

// Composite dedup key: product + length + color + overstock listing combination
export const itemKey = (
  productId: number,
  length?: number,
  lengthIn?: number,
  color?: string,
  overstockId?: number
) => `${productId}::${length ?? ''}::${lengthIn ?? ''}::${color ?? ''}::${overstockId ?? ''}`

export const cartItemKey = (i: CartItem) =>
  itemKey(i.product.id, i.length, i.lengthIn, i.color, i.overstockId)

// Unit price for a single piece. Per-foot products charge the rate × cut length;
// per-piece products charge the rate once (see product price_metric, migration 060).
export const itemUnitPrice = (i: CartItem): number => {
  // Overstock panels are priced per-listing (staff-only) — NOT from the parent
  // product's per-foot price. The storefront never sees the listing price, so an
  // overstock line records 0 here and staff apply the listing's own unit_price
  // (reachable via panel_overstock_id) when they review the order.
  if (i.overstockId != null) return 0
  const totalFt = i.length !== undefined ? i.length + (i.lengthIn ?? 0) / 12 : 0
  // Fall back to "a length implies per-foot" for cart items persisted before the
  // price_metric field existed, so old carts keep their prior pricing.
  const metric = i.product.price_metric ?? (i.length !== undefined ? 'per_foot' : 'per_piece')
  return extendUnitPrice(i.product.price, metric, totalFt)
}

interface CartStore {
  items: CartItem[]
  addItem: (
    product: Product,
    qty?: number,
    opts?: { length?: number; lengthIn?: number; color?: string; overstockId?: number }
  ) => void
  removeItem: (key: string) => void
  updateQty: (key: string, qty: number) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, qty = 1, opts = {}) =>
        set((state) => {
          const key = itemKey(product.id, opts.length, opts.lengthIn, opts.color, opts.overstockId)
          const existing = state.items.find((i) => cartItemKey(i) === key)
          if (existing) {
            return {
              items: state.items.map((i) =>
                cartItemKey(i) === key ? { ...i, quantity: i.quantity + qty } : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity: qty, ...opts }] }
        }),

      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((i) => cartItemKey(i) !== key),
        })),

      updateQty: (key, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => cartItemKey(i) !== key)
              : state.items.map((i) =>
                  cartItemKey(i) === key ? { ...i, quantity: qty } : i
                ),
        })),

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce((sum, i) => sum + itemUnitPrice(i) * i.quantity, 0),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'umc-cart' }
  )
)

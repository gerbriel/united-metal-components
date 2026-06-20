import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types/database'

export interface CartItem {
  product:  Product
  quantity: number
  length?:  number   // feet, for per-foot products
  lengthIn?: number  // extra inches (contractor custom only)
  color?:   string
}

// Composite dedup key: product + length + color combination
export const itemKey = (
  productId: number,
  length?: number,
  lengthIn?: number,
  color?: string
) => `${productId}::${length ?? ''}::${lengthIn ?? ''}::${color ?? ''}`

export const cartItemKey = (i: CartItem) =>
  itemKey(i.product.id, i.length, i.lengthIn, i.color)

// Unit price for a single piece (handles per-foot × length)
export const itemUnitPrice = (i: CartItem): number => {
  if (i.length !== undefined) {
    const totalFt = i.length + (i.lengthIn ?? 0) / 12
    return i.product.price * totalFt
  }
  return i.product.price
}

interface CartStore {
  items: CartItem[]
  addItem: (
    product: Product,
    qty?: number,
    opts?: { length?: number; lengthIn?: number; color?: string }
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
          const key = itemKey(product.id, opts.length, opts.lengthIn, opts.color)
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

'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cart'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQty, removeItem, total } = useCartStore()

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Your Cart ({items.length} item{items.length !== 1 ? 's' : ''})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
            <p className="text-muted-foreground">Your cart is empty</p>
            <ButtonLink href="/products" onClick={onClose}>Browse Products</ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3">
                  <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.unit && `per ${product.unit}`}</p>
                    <p className="text-sm font-semibold text-primary mt-1">${product.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="icon" variant="outline" className="h-7 w-7"
                        onClick={() => updateQty(product.id, quantity - 1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm w-6 text-center">{quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7"
                        onClick={() => updateQty(product.id, quantity + 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive ml-auto"
                        onClick={() => removeItem(product.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">${total().toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Taxes calculated at checkout</p>
              <ButtonLink href="/checkout" className="w-full" size="lg" onClick={onClose}>
                Proceed to Checkout
              </ButtonLink>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

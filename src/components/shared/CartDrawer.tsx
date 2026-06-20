'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCartStore, cartItemKey } from '@/store/cart'
import { COLORS } from '@/lib/product-config'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQty, removeItem } = useCartStore()

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
              {items.map((item) => {
                const { product, quantity, length, lengthIn, color } = item
                const key = cartItemKey(item)
                const colorDef = color ? COLORS.find((c) => c.name === color) : null

                const lengthLabel = length !== undefined
                  ? (lengthIn ? `${length} ft ${lengthIn} in` : length <= 3 ? `${length} ft` : `${length} ft`)
                  : null

                return (
                  <div key={key} className="flex gap-3">
                    <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                      {colorDef ? (
                        <div
                          className="w-full h-full rounded-md"
                          style={
                            colorDef.image
                              ? { backgroundImage: `url(${colorDef.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                              : { backgroundColor: colorDef.hex }
                          }
                        />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{product.name}</p>

                      {/* Length / color badges */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lengthLabel && (
                          <span className="inline-flex items-center text-[10px] font-medium bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                            {lengthLabel}
                          </span>
                        )}
                        {color && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                            {colorDef && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block overflow-hidden"
                                style={
                                  colorDef.image
                                    ? { backgroundImage: `url(${colorDef.image})`, backgroundSize: 'cover' }
                                    : { backgroundColor: colorDef.hex }
                                }
                              />
                            )}
                            {color}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQty(key, quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQty(key, quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive ml-auto"
                          onClick={() => removeItem(key)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-xs text-muted-foreground">Pricing confirmed once your order is reviewed.</p>
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

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonLink } from '@/components/ui/button-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import { Loader2, ShoppingBag, LogIn, MapPin, Clock } from 'lucide-react'
import { checkoutSchema } from '@/lib/validate'
import { sanitizeText, sanitizePhone } from '@/lib/sanitize'

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', notes: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    ;(supabase.auth.getUser() as Promise<{ data: { user: any } }>).then(async ({ data }) => {
      const user = data.user
      setUser(user)
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profile) {
          setForm((f) => ({
            ...f,
            name:  (profile as any).full_name ?? '',
            phone: (profile as any).phone ?? '',
          }))
        }
      }
    })
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { toast.error('Please sign in to place an order'); return }
    if (items.length === 0) { toast.error('Your cart is empty'); return }

    const result = checkoutSchema.safeParse({ ...form, address: '' })
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }

    const clean = {
      name:  sanitizeText(form.name, 100),
      phone: sanitizePhone(form.phone),
      notes: sanitizeText(form.notes, 2000),
    }

    setLoading(true)

    const subtotal = total()
    const tax = subtotal * 0.0825
    const orderTotal = subtotal + tax

    const { data: order, error } = await supabase.from('orders').insert({
      customer_id: user.id,
      status: 'pending',
      subtotal,
      tax,
      total: orderTotal,
      shipping_name:  clean.name,
      shipping_phone: clean.phone,
      shipping_addr:  '9191 W Whitesbridge Ave, Fresno, CA 93706 (Pickup)',
      notes: clean.notes,
    }).select().single()

    if (error || !order) { toast.error('Failed to place order. Please try again.'); setLoading(false); return }

    await supabase.from('order_items').insert(
      items.map((i) => ({
        order_id:   (order as any).id,
        product_id: i.product.id,
        quantity:   i.quantity,
        unit_price: i.product.price,
        total_price: i.product.price * i.quantity,
      }))
    )

    await supabase.from('order_status_history').insert({
      order_id:   (order as any).id,
      new_status: 'pending',
      notes:      'Order placed — awaiting pickup confirmation',
    })

    await supabase.from('notifications').insert({
      user_id:  user.id,
      type:     'order_update',
      title:    `Order #${(order as any).id} Received`,
      message:  `Your order has been received and is being prepared for pickup. Total: $${orderTotal.toFixed(2)}`,
      order_id: (order as any).id,
    })

    clearCart()
    toast.success('Order placed! We\'ll notify you when it\'s ready for pickup.')
    router.push(`/account/orders/${(order as any).id}`)
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <ButtonLink href="/products">Browse Products</ButtonLink>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-8">Place Your Order</h1>

      {!user && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-amber-800">Sign in to place your order and track its status</p>
          <ButtonLink href="/login" size="sm">
            <LogIn className="w-4 h-4 mr-2" />Sign In
          </ButtonLink>
        </div>
      )}

      {/* Pickup notice */}
      <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Pickup Only</p>
          <p className="text-sm text-muted-foreground">9191 W Whitesbridge Ave, Fresno, CA 93706</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Mon–Fri 7am–5pm &bull; Sat 8am–12pm
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            <Card>
              <CardHeader><CardTitle>Your Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Full Name</Label>
                    <Input value={form.name} onChange={set('name')} placeholder="John Smith" required />
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Phone</Label>
                    <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Order Notes (optional)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={set('notes')}
                    placeholder="Preferred pickup time, special instructions..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="order-1 lg:order-2">
            <Card className="sticky top-20">
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{product.name}</span>
                    <span className="font-medium shrink-0 text-muted-foreground">× {quantity}</span>
                  </div>
                ))}
                <Separator />
                <p className="text-xs text-muted-foreground">Pricing will be confirmed once your order is reviewed by our team.</p>

                <Button
                  type="submit"
                  className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white border-0"
                  size="lg"
                  disabled={loading || !user}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Place Order for Pickup
                </Button>
                {!user && (
                  <p className="text-xs text-center text-muted-foreground">Sign in required to place an order</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

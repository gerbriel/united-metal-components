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
import { Loader2, ShoppingBag, LogIn } from 'lucide-react'

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    ;(supabase.auth.getUser() as Promise<{ data: { user: any } }>).then(async ({ data }) => {
      const user = data.user
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setForm((f) => ({
            ...f,
            name: (data as any).full_name ?? '',
            phone: (data as any).phone ?? '',
            address: [(data as any).address, (data as any).city, (data as any).state, (data as any).zip].filter(Boolean).join(', '),
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
      shipping_name: form.name,
      shipping_phone: form.phone,
      shipping_addr: form.address,
      notes: form.notes,
    }).select().single()

    if (error || !order) { toast.error('Failed to place order. Please try again.'); setLoading(false); return }

    await supabase.from('order_items').insert(
      items.map((i) => ({
        order_id: (order as any).id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price,
        total_price: i.product.price * i.quantity,
      }))
    )

    await supabase.from('order_status_history').insert({
      order_id: (order as any).id,
      new_status: 'pending',
      notes: 'Order placed by customer',
    })

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'order_update',
      title: `Order #${(order as any).id} Received`,
      message: `Your order has been received and is pending confirmation. Total: $${orderTotal.toFixed(2)}`,
      order_id: (order as any).id,
    })

    clearCart()
    toast.success('Order placed successfully!')
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

  const subtotal = total()
  const tax = subtotal * 0.0825

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {!user && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-amber-800">Sign in to place your order and track its progress</p>
          <ButtonLink href="/login" size="sm">
            <LogIn className="w-4 h-4 mr-2" />Sign In
          </ButtonLink>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Full Name</Label>
                    <Input value={form.name} onChange={set('name')} placeholder="John Smith" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Pickup / Delivery Address</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={set('address')} placeholder="123 Main St, City, TX 75000" />
                </div>
                <div className="space-y-2">
                  <Label>Order Notes (optional)</Label>
                  <Textarea value={form.notes} onChange={set('notes')} placeholder="Any special instructions..." rows={3} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{product.name} × {quantity}</span>
                    <span className="font-medium shrink-0">${(product.price * quantity).toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (8.25%)</span><span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span><span className="text-primary">${(subtotal + tax).toFixed(2)}</span>
                </div>

                <Button type="submit" className="w-full mt-4" size="lg" disabled={loading || !user}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Place Order
                </Button>
                {!user && <p className="text-xs text-center text-muted-foreground">Sign in required to place order</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

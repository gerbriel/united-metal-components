import type { Metadata } from 'next'
import { MapPin, Clock, Phone, AlertCircle, CheckCircle, Package } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button-link'

export const metadata: Metadata = {
  title: 'Pickup Info | United Metal Components',
  description: 'All orders are pickup only at our Fresno, CA facility — 9191 W Whitesbridge Ave.',
}

const steps = [
  {
    Icon: Package,
    title: 'Place your order',
    desc: 'Add items to your cart and check out online. You\'ll receive an email confirmation immediately.',
  },
  {
    Icon: AlertCircle,
    title: 'Wait for your ready notification',
    desc: 'We\'ll send you an email and in-app notification when your order is pulled and ready for pickup — typically within 1 business day.',
  },
  {
    Icon: CheckCircle,
    title: 'Come pick it up',
    desc: 'Bring your order confirmation (email or phone screen) and a valid ID. Large or heavy items may require a truck or trailer.',
  },
]

export default function PickupPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3 block">
          Pickup Info
        </span>
        <h1 className="text-4xl font-bold mb-4">All orders are pickup only</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          We don&apos;t currently offer delivery. All orders must be picked up at our facility in Fresno, CA. We&apos;ll notify you when your order is ready.
        </p>
      </div>

      {/* Location card */}
      <div className="bg-slate-950 text-white rounded-2xl p-8 mb-12">
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Our Location</p>
                <p className="text-sm text-slate-400">United Metal Components</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              9191 W Whitesbridge Ave<br />
              Fresno, CA 93706
            </p>
            <a
              href="https://maps.google.com/?q=9191+W+Whitesbridge+Ave+Fresno+CA+93706"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm text-orange-400 hover:text-orange-300 underline"
            >
              Open in Google Maps
            </a>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Pickup Hours</p>
                <p className="text-sm text-slate-400">When you can pick up</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Monday – Friday</span>
                <span className="text-white font-medium">7:00 AM – 5:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span className="text-white font-medium">8:00 AM – 12:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span className="text-slate-500">Closed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-8">How pickup works</h2>
        <div className="space-y-6">
          {steps.map(({ Icon, title, desc }, i) => (
            <div key={title} className="flex gap-5">
              <div className="relative">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div className="pt-1">
                <p className="font-semibold mb-1">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Do I need to bring anything to pick up my order?',
              a: 'Yes — bring your order confirmation (email or screen) and a valid photo ID. This helps us match your order and process it quickly.',
            },
            {
              q: 'What vehicle do I need?',
              a: 'Sheet metal panels, trusses, and tubing are long items (up to 20+ ft). A flatbed trailer, long truck bed, or similar is recommended for most structural orders. We\'ll let you know if your specific order has special transport requirements.',
            },
            {
              q: 'Can someone else pick up my order?',
              a: 'Yes. Have them bring the order confirmation and their own photo ID. Contact us in advance to add an authorized pickup person to your order.',
            },
            {
              q: 'How long will you hold my order?',
              a: 'We hold ready orders for up to 7 business days. After that, we\'ll contact you to make arrangements. Extended holds may incur a storage fee.',
            },
            {
              q: 'Can I modify or cancel my order after placing it?',
              a: 'Contact us as soon as possible at (559) 555-5555 or info@unitedmetalcomponents.com. We can modify or cancel orders that haven\'t been pulled yet.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="border border-slate-200 rounded-xl p-5">
              <p className="font-semibold mb-2">{q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-slate-50 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <Phone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Questions about your pickup?</p>
            <p className="text-sm text-muted-foreground">Call or email us and we&apos;ll help you out.</p>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <ButtonLink href="tel:+15595555555" variant="outline" size="sm">Call Us</ButtonLink>
          <ButtonLink href="/contact" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0">Email Us</ButtonLink>
        </div>
      </div>
    </div>
  )
}

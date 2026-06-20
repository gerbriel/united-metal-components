import Link from 'next/link'
import { Package, Mail, Phone, MapPin, ArrowRight } from 'lucide-react'

const productLinks = [
  ['Sheet Metal Panels', '/products?cat=panels'],
  ['Doors & Hardware', '/products?cat=doors-hardware'],
  ['Square Tubing', '/products?cat=square-tubing'],
  ['Trusses', '/products?cat=trusses'],
  ['Anchors', '/products?cat=anchors'],
  ['Insulation', '/products?cat=insulation'],
]

const companyLinks = [
  ['About Us', '/about'],
  ['Contact', '/contact'],
  ['Shipping Info', '/shipping'],
  ['Privacy Policy', '/privacy'],
  ['Terms of Service', '/terms'],
]

export default function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      {/* Top bar */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-base leading-tight">United Metal Components</p>
                <p className="text-sm text-slate-400">Premium metal building materials</p>
              </div>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors group"
            >
              Browse all products
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* About */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-sm leading-relaxed text-slate-500">
              Your regional supplier for quality metal building components — from sheet metal panels to complete carport kits. Built for contractors and DIY builders alike.
            </p>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-4 uppercase tracking-wider">Products</h3>
            <ul className="space-y-2.5">
              {productLinks.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm hover:text-orange-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-4 uppercase tracking-wider">Company</h3>
            <ul className="space-y-2.5">
              {companyLinks.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm hover:text-orange-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-4 uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span className="text-sm">United Metal Components<br />Your City, State ZIP</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                <a href="tel:+15555555555" className="text-sm hover:text-orange-400 transition-colors">
                  (555) 555-5555
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                <a href="mailto:info@unitedmetalcomponents.com" className="text-sm hover:text-orange-400 transition-colors">
                  info@unitedmetalcomponents.com
                </a>
              </li>
            </ul>
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-xs text-slate-600">Mon – Fri: 7am – 5pm</p>
              <p className="text-xs text-slate-600">Sat: 8am – 12pm</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>&copy; {new Date().getFullYear()} United Metal Components. All rights reserved.</p>
          <p>Built with Next.js &amp; Supabase</p>
        </div>
      </div>
    </footer>
  )
}

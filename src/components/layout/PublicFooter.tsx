import Link from 'next/link'
import { Package, Mail, Phone, MapPin } from 'lucide-react'

export default function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">United Metal Components</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Premium metal building components. Sheet metal panels, carport kits, garage doors, trusses, and more.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Products</h3>
            <ul className="space-y-2 text-sm">
              {[
                ['Sheet Metal Panels', '/products?cat=panels'],
                ['Doors & Hardware', '/products?cat=doors-hardware'],
                ['Square Tubing', '/products?cat=square-tubing'],
                ['Trusses', '/products?cat=trusses'],
                ['Anchors', '/products?cat=anchors'],
                ['Insulation', '/products?cat=insulation'],
              ].map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-primary transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              {[
                ['About Us', '/about'],
                ['Contact', '/contact'],
                ['Shipping Info', '/shipping'],
                ['Privacy Policy', '/privacy'],
                ['Terms of Service', '/terms'],
              ].map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-primary transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>United Metal Components<br />Your City, State ZIP</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href="tel:+15555555555" className="hover:text-primary transition-colors">(555) 555-5555</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href="mailto:info@unitedmetalcomponents.com" className="hover:text-primary transition-colors">info@unitedmetalcomponents.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} United Metal Components. All rights reserved.</p>
          <p>Built with Next.js + Supabase</p>
        </div>
      </div>
    </footer>
  )
}

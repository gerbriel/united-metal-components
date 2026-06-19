import Link from 'next/link'
import { Package } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg">United Metal Components</span>
      </Link>
      {children}
    </div>
  )
}

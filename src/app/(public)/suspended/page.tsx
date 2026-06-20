import Link from 'next/link'
import { ShieldOff, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Account Suspended' }

export default function SuspendedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-16">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <ShieldOff className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
      <p className="text-muted-foreground max-w-sm mb-6">
        Your account has been temporarily suspended. Please contact us to resolve any outstanding issues.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="mailto:info@unitedmetalcomponents.com">
          <Button className="bg-primary text-white">
            <Mail className="w-4 h-4 mr-2" />
            Contact Us
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Return to Home</Button>
        </Link>
      </div>
    </div>
  )
}

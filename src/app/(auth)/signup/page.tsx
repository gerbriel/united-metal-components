'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { signupSchema } from '@/lib/validate'
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/sanitize'

export default function SignupPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '', company: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = signupSchema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }

    const clean = {
      fullName: sanitizeText(form.fullName, 100),
      email:    sanitizeEmail(form.email),
      password: form.password,
      phone:    sanitizePhone(form.phone),
      company:  sanitizeText(form.company, 100),
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: clean.email,
      password: clean.password,
      options: { data: { full_name: clean.fullName } },
    })
    if (error) { toast.error(error.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ phone: clean.phone, company: clean.company }).eq('id', user.id)
    }

    toast.success('Account created! Welcome to United Metal Components.')
    router.push('/account')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Join to place orders and track your materials</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="John Smith" value={form.fullName} onChange={set('fullName')} required />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" placeholder="Optional" value={form.company} onChange={set('company')} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Min. 8 chars with letter + number" value={form.password} onChange={set('password')} required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Account
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  )
}

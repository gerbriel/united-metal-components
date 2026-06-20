'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Mail } from 'lucide-react'
import { signupSchema } from '@/lib/validate'
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/sanitize'

type FormState = {
  firstName: string
  lastName: string
  companyName: string
  mailingAddress: string
  businessAddress: string
  email: string
  phone: string
  password: string
}

const EMPTY: FormState = {
  firstName: '', lastName: '', companyName: '',
  mailingAddress: '', businessAddress: '',
  email: '', phone: '', password: '',
}

export default function SignupPage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const supabase = createClient()

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = signupSchema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }

    const clean = {
      firstName:       sanitizeText(form.firstName, 100),
      lastName:        sanitizeText(form.lastName, 100),
      companyName:     sanitizeText(form.companyName, 150),
      mailingAddress:  sanitizeText(form.mailingAddress, 300),
      businessAddress: sanitizeText(form.businessAddress, 300),
      email:           sanitizeEmail(form.email),
      phone:           sanitizePhone(form.phone),
      password:        form.password,
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: clean.email,
      password: clean.password,
      options: {
        data: {
          first_name:       clean.firstName,
          last_name:        clean.lastName,
          full_name:        `${clean.firstName} ${clean.lastName}`.trim(),
          company_name:     clean.companyName,
          phone:            clean.phone,
        },
      },
    })

    if (error) { toast.error(error.message); setLoading(false); return }

    // Update extended profile fields not stored in auth metadata
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        mailing_address:  clean.mailingAddress,
        business_address: clean.businessAddress,
      }).eq('id', user.id)
    }

    // Auto-subscribe to newsletter for pricing alerts, linking user_id for in-app notifications
    await supabase.from('newsletter_subscribers').upsert(
      { email: clean.email, name: `${clean.firstName} ${clean.lastName}`.trim(), status: 'active', user_id: user?.id ?? null },
      { onConflict: 'email' }
    )

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-8 px-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-muted-foreground text-sm mb-2">
            We sent a confirmation link to <span className="font-medium text-foreground">{form.email}</span>.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Click the link in the email to activate your account, then{' '}
            <a href="/login" className="text-primary underline font-medium">sign in here</a>.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t get it? Check your spam folder or{' '}
            <button className="text-primary underline" onClick={() => setDone(false)}>try again</button>.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>All fields are required to complete your profile</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-5">

          {/* Name */}
          <fieldset>
            <legend className="text-sm font-semibold mb-3 text-foreground">Personal Information</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" placeholder="John" value={form.firstName} onChange={set('firstName')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" placeholder="Smith" value={form.lastName} onChange={set('lastName')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" type="tel" placeholder="(559) 000-0000" value={form.phone} onChange={set('phone')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>
          </fieldset>

          {/* Business */}
          <fieldset>
            <legend className="text-sm font-semibold mb-3 text-foreground">Business Information</legend>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" placeholder="Smith Construction LLC" value={form.companyName} onChange={set('companyName')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mailingAddress">Mailing Address *</Label>
                <Input id="mailingAddress" placeholder="123 Main St, City, CA 93700" value={form.mailingAddress} onChange={set('mailingAddress')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="businessAddress">Business Address *</Label>
                <Input id="businessAddress" placeholder="456 Business Blvd, City, CA 93700" value={form.businessAddress} onChange={set('businessAddress')} required />
              </div>
            </div>
          </fieldset>

          {/* Password */}
          <fieldset>
            <legend className="text-sm font-semibold mb-3 text-foreground">Account Security</legend>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" placeholder="Min. 8 chars with letter + number" value={form.password} onChange={set('password')} required />
            </div>
          </fieldset>

          <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0" disabled={loading}>
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

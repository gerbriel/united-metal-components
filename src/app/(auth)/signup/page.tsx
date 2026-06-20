'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Mail, HardHat, Home, ArrowLeft } from 'lucide-react'
import { signupRetailSchema, signupContractorSchema } from '@/lib/validate'
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/sanitize'

type AccountType = 'retail' | 'contractor' | null

type RetailForm = {
  firstName: string; lastName: string
  email: string; phone: string; password: string
}

type ContractorForm = {
  firstName: string; lastName: string
  email: string; phone: string; password: string
  companyName: string; contractorLicense: string; resellerLicense: string
}

const EMPTY_RETAIL: RetailForm = {
  firstName: '', lastName: '', email: '', phone: '', password: '',
}

const EMPTY_CONTRACTOR: ContractorForm = {
  firstName: '', lastName: '', email: '', phone: '', password: '',
  companyName: '', contractorLicense: '', resellerLicense: '',
}

export default function SignupPage() {
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [retail, setRetail]           = useState<RetailForm>(EMPTY_RETAIL)
  const [contractor, setContractor]   = useState<ContractorForm>(EMPTY_CONTRACTOR)
  const [loading, setLoading]         = useState(false)
  const [done, setDone]               = useState(false)
  const [doneEmail, setDoneEmail]     = useState('')
  const supabase = createClient()

  const setR = (k: keyof RetailForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRetail((f) => ({ ...f, [k]: e.target.value }))

  const setC = (k: keyof ContractorForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setContractor((f) => ({ ...f, [k]: e.target.value }))

  const handleRetailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = signupRetailSchema.safeParse(retail)
    if (!result.success) { toast.error(result.error.issues[0].message); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email:    sanitizeEmail(retail.email),
      password: retail.password,
      options: {
        data: {
          first_name: sanitizeText(retail.firstName, 100),
          last_name:  sanitizeText(retail.lastName, 100),
          full_name:  `${sanitizeText(retail.firstName, 100)} ${sanitizeText(retail.lastName, 100)}`.trim(),
          phone:      sanitizePhone(retail.phone),
        },
      },
    })
    if (error) { toast.error(error.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        customer_type: 'retail',
        pricing_tier:  'retail',
      }).eq('id', user.id)

      await supabase.from('newsletter_subscribers').upsert(
        { email: sanitizeEmail(retail.email), name: `${retail.firstName} ${retail.lastName}`.trim(), status: 'active', user_id: user.id },
        { onConflict: 'email' }
      )
    }

    setDoneEmail(retail.email)
    setDone(true)
    setLoading(false)
  }

  const handleContractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = signupContractorSchema.safeParse(contractor)
    if (!result.success) { toast.error(result.error.issues[0].message); return }

    setLoading(true)
    const clean = {
      firstName:         sanitizeText(contractor.firstName, 100),
      lastName:          sanitizeText(contractor.lastName, 100),
      email:             sanitizeEmail(contractor.email),
      phone:             sanitizePhone(contractor.phone),
      companyName:       sanitizeText(contractor.companyName, 150),
      contractorLicense: sanitizeText(contractor.contractorLicense, 100),
      resellerLicense:   sanitizeText(contractor.resellerLicense, 100),
    }

    const { error } = await supabase.auth.signUp({
      email:    clean.email,
      password: contractor.password,
      options: {
        data: {
          first_name:   clean.firstName,
          last_name:    clean.lastName,
          full_name:    `${clean.firstName} ${clean.lastName}`.trim(),
          company_name: clean.companyName,
          phone:        clean.phone,
        },
      },
    })
    if (error) { toast.error(error.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        customer_type:      'contractor',
        contractor_license: clean.contractorLicense || null,
        reseller_license:   clean.resellerLicense   || null,
      }).eq('id', user.id)

      await supabase.from('newsletter_subscribers').upsert(
        { email: clean.email, name: `${clean.firstName} ${clean.lastName}`.trim(), status: 'active', user_id: user.id },
        { onConflict: 'email' }
      )
    }

    setDoneEmail(contractor.email)
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
            We sent a confirmation link to <span className="font-medium text-foreground">{doneEmail}</span>.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Click the link to activate your account, then{' '}
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

  /* ── Step 1: account type selection ── */
  if (accountType === null) {
    return (
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1">Create Account</h1>
          <p className="text-muted-foreground text-sm">What best describes you?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setAccountType('contractor')}
            className="group flex flex-col items-center gap-4 p-7 rounded-2xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
              <HardHat className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-base">Contractor / Business</p>
              <p className="text-sm text-muted-foreground mt-1">
                Building materials for commercial or residential projects. Contractor pricing available.
              </p>
            </div>
          </button>

          <button
            onClick={() => setAccountType('retail')}
            className="group flex flex-col items-center gap-4 p-7 rounded-2xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Home className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-base">Homeowner / Retail</p>
              <p className="text-sm text-muted-foreground mt-1">
                One-off parts or personal projects. Standard retail pricing.
              </p>
            </div>
          </button>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    )
  }

  /* ── Step 2: forms ── */
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAccountType(null)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <CardTitle>
              {accountType === 'contractor' ? 'Contractor / Business Account' : 'Homeowner Account'}
            </CardTitle>
            <CardDescription className="mt-0.5">
              {accountType === 'contractor'
                ? 'Business information helps us apply the right pricing for your account.'
                : 'We just need the basics to get you started.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {accountType === 'retail' ? (
          <form onSubmit={handleRetailSubmit} className="space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold mb-3">Your Information</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-first">First Name *</Label>
                  <Input id="r-first" placeholder="John" value={retail.firstName} onChange={setR('firstName')} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-last">Last Name *</Label>
                  <Input id="r-last" placeholder="Smith" value={retail.lastName} onChange={setR('lastName')} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-phone">Phone *</Label>
                  <Input id="r-phone" type="tel" placeholder="(559) 000-0000" value={retail.phone} onChange={setR('phone')} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-email">Email *</Label>
                  <Input id="r-email" type="email" placeholder="you@email.com" value={retail.email} onChange={setR('email')} required />
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold mb-3">Account Security</legend>
              <div className="space-y-1.5">
                <Label htmlFor="r-pass">Password *</Label>
                <Input id="r-pass" type="password" placeholder="Min. 8 chars with letter + number" value={retail.password} onChange={setR('password')} required />
              </div>
            </fieldset>

            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </form>
        ) : (
          <form onSubmit={handleContractorSubmit} className="space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold mb-3">Personal Information</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-first">First Name *</Label>
                  <Input id="c-first" placeholder="John" value={contractor.firstName} onChange={setC('firstName')} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-last">Last Name *</Label>
                  <Input id="c-last" placeholder="Smith" value={contractor.lastName} onChange={setC('lastName')} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone">Phone *</Label>
                  <Input id="c-phone" type="tel" placeholder="(559) 000-0000" value={contractor.phone} onChange={setC('phone')} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">Email *</Label>
                  <Input id="c-email" type="email" placeholder="you@company.com" value={contractor.email} onChange={setC('email')} required />
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold mb-3">Business Information</legend>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-company">Company Name *</Label>
                  <Input id="c-company" placeholder="Smith Construction LLC" value={contractor.companyName} onChange={setC('companyName')} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-clic">Contractor License #</Label>
                    <Input id="c-clic" placeholder="Optional" value={contractor.contractorLicense} onChange={setC('contractorLicense')} />
                    <p className="text-xs text-muted-foreground">CA contractor license number</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-rlic">Reseller License #</Label>
                    <Input id="c-rlic" placeholder="Optional" value={contractor.resellerLicense} onChange={setC('resellerLicense')} />
                    <p className="text-xs text-muted-foreground">Required for tax-exempt pricing</p>
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold mb-3">Account Security</legend>
              <div className="space-y-1.5">
                <Label htmlFor="c-pass">Password *</Label>
                <Input id="c-pass" type="password" placeholder="Min. 8 chars with letter + number" value={contractor.password} onChange={setC('password')} required />
              </div>
            </fieldset>

            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Account
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Contractor pricing is reviewed and activated by our team after account creation.
            </p>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, HardHat, Home, ArrowLeft } from 'lucide-react'
import { sanitizeText, sanitizePhone } from '@/lib/sanitize'

// Finish setting up an account created through Google sign-in. OAuth gives us a
// verified email and a display name, but none of the info the normal signup
// forms collect — so the /auth/callback route sends any signed-in customer with
// no customer_type here to pick an account type (one-off vs contractor) and
// fill in the rest. Saving mirrors the password signup flows exactly: retail
// gets the retail pricing tier; contractor stays unassigned until admin review.
type AccountType = 'retail' | 'contractor' | null

export default function CompleteSignupPage() {
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contractorLicense, setContractorLicense] = useState('')
  const [resellerLicense, setResellerLicense] = useState('')
  const [email, setEmail] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      // maybeSingle: the profile row can be MISSING entirely (an OAuth signup
      // whose trigger insert didn't happen) — we recreate it on save.
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name, phone, customer_type')
        .eq('id', user.id)
        .maybeSingle()
      const d = data as {
        first_name: string | null; last_name: string | null
        full_name: string | null; phone: string | null; customer_type: string | null
      } | null
      // Already completed (or a password signup landing here by accident).
      if (d?.customer_type) { router.replace('/account'); return }
      // Prefill from the profile, falling back to Google's auth metadata when
      // there is no row yet: split full_name when first/last are unset.
      const meta = (user.user_metadata ?? {}) as { full_name?: string }
      const [first = '', ...rest] = (d?.full_name ?? meta.full_name ?? '').trim().split(/\s+/)
      setFirstName(d?.first_name ?? first)
      setLastName(d?.last_name ?? rest.join(' '))
      setPhone(d?.phone ?? '')
      setEmail(user.email ?? '')
      setReady(true)
    })
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const first = sanitizeText(firstName, 100)
    const last = sanitizeText(lastName, 100)
    const cleanPhone = sanitizePhone(phone)
    if (!first || !last) { toast.error('Enter your first and last name'); return }
    if (!cleanPhone) { toast.error('Enter your phone number'); return }
    const company = sanitizeText(companyName, 150)
    if (accountType === 'contractor' && !company) { toast.error('Enter your company name'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    // UPSERT, not update: recreates the profile row if the signup trigger never
    // made one (an update matching 0 rows would "succeed" while saving nothing).
    // Needs the users-insert-own-profile RLS policy (migration 069).
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? null,
      first_name: first,
      last_name: last,
      full_name: `${first} ${last}`.trim(),
      phone: cleanPhone,
      customer_type: accountType,
      ...(accountType === 'retail'
        ? { pricing_tier: 'retail' }
        : {
            company_name: company,
            contractor_license: sanitizeText(contractorLicense, 100) || null,
            reseller_license: sanitizeText(resellerLicense, 100) || null,
          }),
    }, { onConflict: 'id' })
    if (error) { toast.error('Failed to save your info — please try again'); setLoading(false); return }

    if (user.email) {
      await supabase.from('newsletter_subscribers').upsert(
        { email: user.email, name: `${first} ${last}`.trim(), status: 'active', user_id: user.id },
        { onConflict: 'email' },
      )
    }
    toast.success('Account set up!')
    router.push('/account')
    router.refresh()
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
      </div>
    )
  }

  /* ── Step 1: account type ── */
  if (accountType === null) {
    return (
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1">Almost there</h1>
          <p className="text-muted-foreground text-sm">
            You&apos;re signed in as <span className="font-medium text-foreground">{email}</span>. What best describes you?
          </p>
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
              <p className="font-semibold text-base">One-off Customer</p>
              <p className="text-sm text-muted-foreground mt-1">
                One-off parts or personal projects.
              </p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  /* ── Step 2: the info the normal signup form would have collected ── */
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset>
            <legend className="text-sm font-semibold mb-3">
              {accountType === 'contractor' ? 'Personal Information' : 'Your Information'}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-first">First Name *</Label>
                <Input id="c-first" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-last">Last Name *</Label>
                <Input id="c-last" placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Phone *</Label>
                <Input id="c-phone" type="tel" placeholder="(559) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={email} readOnly disabled className="bg-slate-50 text-muted-foreground" />
              </div>
            </div>
          </fieldset>

          {accountType === 'contractor' && (
            <fieldset>
              <legend className="text-sm font-semibold mb-3">Business Information</legend>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-company">Company Name *</Label>
                  <Input id="c-company" placeholder="Smith Construction LLC" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-cl">Contractor License #</Label>
                    <Input id="c-cl" placeholder="Optional" value={contractorLicense} onChange={(e) => setContractorLicense(e.target.value)} />
                    <p className="text-xs text-muted-foreground">CA contractor license number</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-rl">Reseller License #</Label>
                    <Input id="c-rl" placeholder="Optional" value={resellerLicense} onChange={(e) => setResellerLicense(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Required for tax-exempt pricing</p>
                  </div>
                </div>
              </div>
            </fieldset>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Finish Setting Up
          </Button>
          {accountType === 'contractor' && (
            <p className="text-xs text-center text-muted-foreground">
              Our team reviews business accounts and applies contractor pricing to your account.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

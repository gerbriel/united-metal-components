'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'

// Where a customer lands from the "set your password" email (Supabase recovery
// link sent when staff create their account). The browser client parses the
// recovery token out of the URL and establishes a short-lived session; this
// page then lets them choose a password via updateUser().
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // detectSessionInUrl (browser client default) resolves the recovery token
    // asynchronously — catch both the already-parsed session and the event.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setHasSession(true); setChecking(false) }
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }
    toast.success('Password set — you are signed in')
    router.push('/account')
    router.refresh()
  }

  if (checking) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!hasSession) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Link expired</CardTitle>
          <CardDescription>This password link is invalid or has already been used.</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <p className="text-sm text-muted-foreground mb-5">
            You can still sign in with an email link, then set a password from your account settings.
          </p>
          <ButtonLink href="/login" className="w-full">Go to sign in</ButtonLink>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>Choose a password to finish setting up your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" className="pl-9" placeholder="At least 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="confirm" type="password" className="pl-9" placeholder="Re-enter password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Set password &amp; continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

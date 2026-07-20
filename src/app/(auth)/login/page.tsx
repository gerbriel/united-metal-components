'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAFF_ROLES } from '@/types/database'

type Mode = 'password' | 'magic'

// Google "G" mark, inline so no external asset is fetched.
function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // A failed OAuth round-trip lands back here as /login?error=oauth (see
  // app/auth/callback) — surface it once and clean the URL.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'oauth') {
      toast.error("Google sign-in didn't complete. Please try again.")
      window.history.replaceState(null, '', '/login')
    }
  }, [])

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    // On success the browser navigates away to Google — only errors return.
    if (error) { toast.error(error.message); setGoogleLoading(false) }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const profile = profileData as { role: string } | null
      router.push(STAFF_ROLES.includes(profile?.role as any) ? '/dashboard' : '/account')
      router.refresh()
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Enter your email address'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    setMagicSent(true)
    setLoading(false)
  }

  if (magicSent) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-8 px-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-muted-foreground text-sm mb-6">
            We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Click the link in the email to sign in instantly — no password needed.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t get it?{' '}
            <button className="text-primary underline" onClick={() => setMagicSent(false)}>
              Try again
            </button>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Access your account and track your orders</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
          {([['password', Lock, 'Password'], ['magic', Mail, 'Email Link']] as const).map(([m, Icon, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all',
                mode === m
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {mode === 'magic' ? (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Sign-In Link
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              We&apos;ll email you a one-click link — no password required.
            </p>
          </form>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-pw">Email</Label>
              <Input id="email-pw" type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline font-medium">Create one free</Link>
        </p>
      </CardContent>
    </Card>
  )
}

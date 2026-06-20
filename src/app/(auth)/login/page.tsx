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
import { Loader2, Mail, Lock, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const profile = profileData as { role: string } | null
      router.push(profile?.role === 'employee' || profile?.role === 'admin' ? '/dashboard' : '/account')
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
          {([['magic', Mail, 'Email Link'], ['password', Lock, 'Password']] as const).map(([m, Icon, label]) => (
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

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline font-medium">Create one free</Link>
        </p>
      </CardContent>
    </Card>
  )
}

export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isStaffRole, isOfficeOrAdminRole, type Testimonial } from '@/types/database'
import TestimonialManager from '@/components/shared/TestimonialManager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Testimonials — Dashboard' }

export default async function TestimonialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? ''
  if (!isStaffRole(role)) redirect('/')
  if (!isOfficeOrAdminRole(role)) redirect('/dashboard') // warehouse staff can't manage marketing content

  const { data: rows } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order')
    .order('id')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Testimonials</h1>
        <p className="text-sm text-muted-foreground">
          The customer stories shown on the home page. Reorder them, hide one without deleting it, or add new
          quotes. Only active testimonials appear on the site.
        </p>
      </div>
      <TestimonialManager initial={(rows ?? []) as Testimonial[]} />
    </div>
  )
}

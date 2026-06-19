'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Share2, Camera, MessageSquare } from 'lucide-react'

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: Share2 },
  { id: 'instagram', label: 'Instagram', icon: Camera },
  { id: 'twitter', label: 'X / Twitter', icon: MessageSquare },
]

export default function SocialPostComposer() {
  const [content, setContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook'])
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const togglePlatform = (id: string) =>
    setSelectedPlatforms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id])

  const handleSave = async (status: 'draft' | 'scheduled') => {
    if (!content.trim()) { toast.error('Post content required'); return }
    if (status === 'scheduled' && !scheduledAt) { toast.error('Please set a schedule time'); return }
    if (selectedPlatforms.length === 0) { toast.error('Select at least one platform'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('social_posts').insert({
      content: content.trim(),
      platforms: selectedPlatforms,
      status,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      created_by: user?.id ?? null,
    })
    if (error) { toast.error('Failed to save post'); setLoading(false); return }
    toast.success(status === 'draft' ? 'Draft saved' : 'Post scheduled!')
    setContent('')
    setScheduledAt('')
    router.refresh()
    setLoading(false)
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Post Content</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5}
            placeholder="Write your post content here..." />
          <p className="text-xs text-muted-foreground text-right">{content.length} characters</p>
        </div>

        <div className="space-y-1.5">
          <Label>Platforms</Label>
          <div className="flex gap-2">
            {PLATFORMS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => togglePlatform(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  selectedPlatforms.includes(id) ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50'
                }`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Schedule For (optional)</Label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Draft
          </Button>
          <Button onClick={() => handleSave('scheduled')} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Schedule Post
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

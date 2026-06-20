'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Pencil, CheckCircle, XCircle, Package } from 'lucide-react'
import type { PurchaseOrder } from './PurchaseOrderForm'
import type { Vendor } from './VendorManager'
import PurchaseOrderForm from './PurchaseOrderForm'

interface Props {
  po: PurchaseOrder & { purchase_order_items: any[] }
  vendors: Vendor[]
  isAdmin: boolean
}

export default function POActions({ po, vendors, isAdmin }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10))
  const router = useRouter()
  const supabase = createClient()

  const setStatus = async (status: string) => {
    setLoading(status)
    const update: Record<string, any> = { status }
    if (status === 'received') update.received_date = receivedDate
    const { error } = await supabase.from('purchase_orders').update(update).eq('id', po.id)
    if (error) toast.error('Failed to update status')
    else { toast.success(`PO marked as ${status}`); router.refresh() }
    setLoading(null)
    setReceiveOpen(false)
  }

  const canSubmit  = po.status === 'draft'
  const canReceive = po.status === 'submitted' || po.status === 'partial'
  const canCancel  = po.status === 'draft' || po.status === 'submitted'
  const canEdit    = po.status === 'draft' || po.status === 'submitted'

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {canEdit && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <Pencil className="w-4 h-4" />Edit PO
              </Button>
            } />
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Edit Purchase Order</DialogTitle></DialogHeader>
              <PurchaseOrderForm
                vendors={vendors}
                existingPO={{ ...po, purchase_order_items: po.purchase_order_items }}
              />
            </DialogContent>
          </Dialog>
        )}

        {canSubmit && (
          <Button
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => setStatus('submitted')}
            disabled={!!loading}
          >
            {loading === 'submitted' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Submit to Vendor
          </Button>
        )}

        {canReceive && (
          <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="w-full justify-start gap-2 text-green-700 border-green-300 hover:bg-green-50" size="sm">
                <Package className="w-4 h-4" />Mark Received
              </Button>
            } />
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Mark as Received</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>Received Date</Label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  This will mark all items as fully received and update the PO status.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReceiveOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={() => setStatus('received')} disabled={!!loading}>
                  {loading === 'received' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm Receipt
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {canCancel && isAdmin && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            size="sm"
            onClick={() => setStatus('cancelled')}
            disabled={!!loading}
          >
            {loading === 'cancelled' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Cancel PO
          </Button>
        )}

        {po.status === 'received' && (
          <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Order fully received
          </p>
        )}
      </CardContent>
    </Card>
  )
}

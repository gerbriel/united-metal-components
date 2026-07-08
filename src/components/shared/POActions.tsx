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
import { Loader2, Pencil, CheckCircle, XCircle, Package, FileText, Mail, Download } from 'lucide-react'
import type { PurchaseOrder } from './PurchaseOrderForm'
import type { Vendor } from './VendorManager'
import PurchaseOrderForm from './PurchaseOrderForm'
import { generatePoPdf } from '@/lib/po-pdf'

interface Props {
  po: PurchaseOrder & { purchase_order_items: any[] }
  vendors: Vendor[]
  isAdmin: boolean
}

export default function POActions({ po, vendors, isAdmin }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [pdfFilename, setPdfFilename] = useState<string | null>(null)
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10))
  const router = useRouter()
  const supabase = createClient()

  // Vendor details (from the joined row, falling back to the vendors list)
  const vendor =
    (po as any).vendors ?? vendors.find((v) => v.id === po.vendor_id) ?? null
  const poLabel = po.po_number ?? po.id.slice(0, 8).toUpperCase()

  const downloadPdf = () => {
    try {
      const filename = generatePoPdf(
        po as any,
        vendor,
        (po.purchase_order_items ?? []) as any[],
      )
      setPdfFilename(filename)
      return filename
    } catch (e) {
      console.error(e)
      toast.error('Failed to generate PDF')
      return null
    }
  }

  const openVendorEmail = () => {
    const to = vendor?.email ?? ''
    const subject = `Purchase Order ${poLabel} — United Metal Components`
    const body =
      `Hello${vendor?.contact_name ? ' ' + vendor.contact_name : ''},\n\n` +
      `Please find attached Purchase Order ${poLabel}.\n\n` +
      `(Attach the downloaded PDF "${pdfFilename ?? `PO-${poLabel}.pdf`}" before sending.)\n\n` +
      `Thank you,\nUnited Metal Components`
    window.location.href =
      `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const setStatus = async (status: string) => {
    setLoading(status)
    const update: Record<string, any> = { status }
    if (status === 'received') update.received_date = receivedDate
    const { error } = await supabase.from('purchase_orders').update(update).eq('id', po.id)
    if (error) { toast.error('Failed to update status'); setLoading(null); return }
    toast.success(`PO marked as ${status}`)
    // On submit: export the PDF and prompt to email it to the vendor
    if (status === 'submitted') {
      downloadPdf()
      setEmailOpen(true)
    }
    router.refresh()
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

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          size="sm"
          onClick={downloadPdf}
        >
          <FileText className="w-4 h-4" />Download PDF
        </Button>

        {po.status !== 'draft' && po.status !== 'cancelled' && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => setEmailOpen(true)}
          >
            <Mail className="w-4 h-4" />Email to Vendor
          </Button>
        )}

        <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Email PO to Vendor</DialogTitle></DialogHeader>
            <div className="space-y-3 py-1 text-sm">
              <p className="text-muted-foreground">
                The PDF for <span className="font-mono font-medium text-foreground">{poLabel}</span>{' '}
                {pdfFilename ? 'has been downloaded' : 'can be downloaded below'}. Attach it to the
                email draft before sending.
              </p>
              {vendor?.email ? (
                <p>
                  To: <span className="font-medium">{vendor.email}</span>
                </p>
              ) : (
                <p className="text-amber-600">
                  This vendor has no email on file — the draft will open with an empty recipient.
                </p>
              )}
              {!pdfFilename && (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={downloadPdf}>
                  <Download className="w-4 h-4" />Download PDF
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEmailOpen(false)}>
                Close
              </Button>
              <Button className="flex-1 gap-2" onClick={openVendorEmail}>
                <Mail className="w-4 h-4" />Open Email Draft
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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

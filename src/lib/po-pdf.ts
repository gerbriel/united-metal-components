import { jsPDF } from 'jspdf'

export interface POVendorInfo {
  name?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}

export interface POPdfItem {
  description?: string | null
  quantity?: number | null
  unit?: string | null
  unit_cost?: number | null
  total_cost?: number | null
  notes?: string | null
}

export interface POPdfData {
  po_number?: string | null
  id: string
  status?: string | null
  order_date?: string | null
  expected_date?: string | null
  notes?: string | null
  subtotal?: number | null
  total?: number | null
}

const COMPANY_NAME = 'United Metal Components'

const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${Number(n).toFixed(2)}`

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString() : '—'

/** Build a purchase-order PDF and trigger a download. Returns the filename used. */
export function generatePoPdf(
  po: POPdfData,
  vendor: POVendorInfo | null,
  items: POPdfItem[],
): string {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 48
  const contentW = pageW - marginX * 2
  const poLabel = po.po_number ?? po.id.slice(0, 8).toUpperCase()
  let y = 56

  // Header
  doc.setFont('helvetica', 'bold').setFontSize(18)
  doc.text(COMPANY_NAME, marginX, y)
  doc.setFont('helvetica', 'bold').setFontSize(16)
  doc.text('PURCHASE ORDER', pageW - marginX, y, { align: 'right' })
  y += 20
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(110)
  doc.text(`PO #: ${poLabel}`, pageW - marginX, y, { align: 'right' })
  doc.setTextColor(0)

  y += 24
  doc.setDrawColor(210).setLineWidth(1).line(marginX, y, pageW - marginX, y)
  y += 24

  // Vendor + meta columns
  const colGap = 24
  const colW = (contentW - colGap) / 2
  const rightX = marginX + colW + colGap
  const topY = y

  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(120)
  doc.text('VENDOR', marginX, y)
  doc.setTextColor(0).setFont('helvetica', 'normal').setFontSize(11)
  y += 16
  const vendorLines = [
    vendor?.name,
    vendor?.contact_name,
    vendor?.phone,
    vendor?.email,
    vendor?.address,
  ].filter(Boolean) as string[]
  if (vendorLines.length === 0) vendorLines.push('—')
  for (const line of vendorLines) {
    for (const wrapped of doc.splitTextToSize(line, colW)) {
      doc.text(wrapped, marginX, y)
      y += 15
    }
  }

  // Meta block (right)
  let my = topY
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(120)
  doc.text('DETAILS', rightX, my)
  my += 16
  doc.setFontSize(10)
  const meta: [string, string][] = [
    ['Order Date', fmtDate(po.order_date)],
    ['Expected', fmtDate(po.expected_date)],
    ['Status', (po.status ?? 'draft').replace(/^\w/, (c) => c.toUpperCase())],
  ]
  for (const [k, v] of meta) {
    doc.setFont('helvetica', 'normal').setTextColor(120)
    doc.text(k, rightX, my)
    doc.setFont('helvetica', 'bold').setTextColor(0)
    doc.text(v, pageW - marginX, my, { align: 'right' })
    my += 16
  }

  y = Math.max(y, my) + 16

  // Line items table
  const cols = [
    { key: 'desc', label: 'Description', w: contentW - 60 - 55 - 75 - 80, align: 'left' as const },
    { key: 'qty', label: 'Qty', w: 60, align: 'right' as const },
    { key: 'unit', label: 'Unit', w: 55, align: 'left' as const },
    { key: 'cost', label: 'Unit Cost', w: 75, align: 'right' as const },
    { key: 'total', label: 'Total', w: 80, align: 'right' as const },
  ]
  const colX: number[] = []
  let cx = marginX
  for (const c of cols) { colX.push(cx); cx += c.w }

  const drawHeader = () => {
    doc.setFillColor(244, 246, 248)
    doc.rect(marginX, y, contentW, 22, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(90)
    cols.forEach((c, i) => {
      const tx = c.align === 'right' ? colX[i] + c.w - 6 : colX[i] + 6
      doc.text(c.label, tx, y + 15, { align: c.align })
    })
    doc.setTextColor(0)
    y += 22
  }

  const ensureSpace = (h: number) => {
    if (y + h > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      y = 56
      drawHeader()
    }
  }

  drawHeader()
  doc.setFont('helvetica', 'normal').setFontSize(10)

  for (const item of items) {
    const descText = item.description ?? '—'
    const descWrapped = doc.splitTextToSize(descText, cols[0].w - 12) as string[]
    const noteWrapped = item.notes
      ? (doc.splitTextToSize(item.notes, cols[0].w - 12) as string[])
      : []
    const rowH = Math.max(22, descWrapped.length * 13 + noteWrapped.length * 11 + 9)
    ensureSpace(rowH)

    const cells = [
      null,
      item.quantity != null ? String(item.quantity) : '—',
      item.unit ?? '—',
      money(item.unit_cost),
      money(item.total_cost ??
        (item.quantity != null && item.unit_cost != null ? item.quantity * item.unit_cost : null)),
    ]

    let ty = y + 15
    doc.setTextColor(0)
    descWrapped.forEach((line) => { doc.text(line, colX[0] + 6, ty); ty += 13 })
    if (noteWrapped.length) {
      doc.setFontSize(8).setTextColor(140)
      noteWrapped.forEach((line) => { doc.text(line, colX[0] + 6, ty); ty += 11 })
      doc.setFontSize(10).setTextColor(0)
    }

    cols.forEach((c, i) => {
      if (i === 0) return
      const tx = c.align === 'right' ? colX[i] + c.w - 6 : colX[i] + 6
      doc.text(String(cells[i]), tx, y + 15, { align: c.align })
    })

    y += rowH
    doc.setDrawColor(228).setLineWidth(0.5).line(marginX, y, pageW - marginX, y)
  }

  // Total
  const total = po.total ?? po.subtotal ??
    items.reduce((s, i) => s + (i.total_cost ??
      ((i.quantity ?? 0) * (i.unit_cost ?? 0))), 0)
  y += 18
  ensureSpace(24)
  doc.setFont('helvetica', 'bold').setFontSize(11)
  doc.text('Total', colX[3] + cols[3].w - 6, y, { align: 'right' })
  doc.text(money(total), pageW - marginX, y, { align: 'right' })

  // Notes
  if (po.notes) {
    y += 30
    ensureSpace(40)
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(120)
    doc.text('NOTES', marginX, y)
    y += 15
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(0)
    for (const line of doc.splitTextToSize(po.notes, contentW) as string[]) {
      ensureSpace(14)
      doc.text(line, marginX, y)
      y += 14
    }
  }

  const filename = `PO-${poLabel}.pdf`
  doc.save(filename)
  return filename
}

'use client'

import { useRouter } from 'next/navigation'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export interface VariantOption {
  id: number
  label: string
  section?: string
}

// Split a member-ordered option list into contiguous dropdown sections
// (members without a section land in an untitled section).
export function sectionize<T extends { section?: string }>(options: T[]) {
  const sections: { title?: string; options: T[] }[] = []
  for (const o of options) {
    const last = sections[sections.length - 1]
    if (last && last.title === o.section) last.options.push(o)
    else sections.push({ title: o.section, options: [o] })
  }
  return sections
}

// Variant picker on a grouped product page (tubing size, screw package, …):
// switching navigates to the sibling variant's product page — each variant is
// its own SKU/product row, exactly like door sizes.
export default function VariantSelect({
  label,
  options,
  currentId,
}: {
  label: string
  options: VariantOption[]
  currentId: number
}) {
  const router = useRouter()

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <Select value={String(currentId)} onValueChange={(id) => router.push(`/products/${id}`)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
            {options.find((o) => o.id === currentId)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sectionize(options).map((s, i) => (
            <SelectGroup key={s.title ?? i}>
              {s.title && <SelectLabel>{s.title}</SelectLabel>}
              {s.options.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

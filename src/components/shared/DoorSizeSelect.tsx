'use client'

import { useRouter } from 'next/navigation'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export interface DoorSizeOption {
  id: number
  label: string
  common: boolean
}

// Size picker on a door product page: switching sizes navigates to the sibling
// size's product page (each size is its own SKU/product row).
export default function DoorSizeSelect({ options, currentId }: { options: DoorSizeOption[]; currentId: number }) {
  const router = useRouter()
  const common = options.filter((o) => o.common)
  const other = options.filter((o) => !o.common)

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-1.5">Size</label>
      <Select value={String(currentId)} onValueChange={(id) => router.push(`/products/${id}`)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select size">
            {options.find((o) => o.id === currentId)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {common.length > 0 && (
            <SelectGroup>
              <SelectLabel>Common sizes</SelectLabel>
              {common.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>
              ))}
            </SelectGroup>
          )}
          {other.length > 0 && (
            <SelectGroup>
              <SelectLabel>More sizes</SelectLabel>
              {other.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

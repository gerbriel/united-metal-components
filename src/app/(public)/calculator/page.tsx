import type { Metadata } from 'next'
import CarportCalculator from '@/components/shared/CarportCalculator'

export const metadata: Metadata = {
  title: 'Carport Material Calculator | United Metal Components',
  description:
    'Estimate the panels, trim, and framing for your metal carport or building. Enter your dimensions and roof style to get an instant material list.',
}

export default function PublicCalculatorPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <CarportCalculator variant="public" />
    </div>
  )
}

export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OVERSTOCK_SKUS } from '@/lib/product-config'

// Overstock isn't a category — it's a single product. This is the nav entry
// point that gives it category-like findability: it resolves the overstock panel
// product by SKU and sends the customer straight to its page, where the
// pick-from-inventory buyer flow lives. Robust to the product's DB id and to
// whether the (now-removed) 'overstock' category still exists.
export default async function OverstockEntry() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id')
    .in('sku', [...OVERSTOCK_SKUS])
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  redirect(data?.id ? `/products/${data.id}` : '/products?cat=panels')
}

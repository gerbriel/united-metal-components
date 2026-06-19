import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

type ButtonLinkProps = ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>

export function ButtonLink({ className, variant, size, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {children}
    </Link>
  )
}

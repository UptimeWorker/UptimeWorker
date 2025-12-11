import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gray-900 text-gray-50 dark:bg-gray-50 dark:text-gray-900',
        operational:
          'border-transparent bg-operational-light/20 text-operational-dark dark:bg-operational/30 dark:text-operational-light',
        incident:
          'border-transparent bg-incident-light/20 text-incident-dark dark:bg-incident/30 dark:text-incident-light',
        degraded:
          'border-transparent bg-degraded-light/20 text-degraded-dark dark:bg-degraded/30 dark:text-degraded-light',
        outline: 'text-gray-950 dark:text-gray-50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

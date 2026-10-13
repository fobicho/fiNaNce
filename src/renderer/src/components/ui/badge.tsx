import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary border border-primary/20',
        income: 'bg-green-500/10 text-green-500 border border-green-500/20',
        expense: 'bg-red-500/10 text-red-500 border border-red-500/20',
        warning: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
        outline: 'border border-border text-muted-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

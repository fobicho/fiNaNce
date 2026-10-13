import { Button } from './button'
import { cn } from '../../lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  ariaLabel?: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel
}: SegmentedProps<T>) {
  return (
    <div className={cn('flex gap-2', className)} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? 'default' : 'outline'}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

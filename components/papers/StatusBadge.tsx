import { Badge } from '@/components/ui/Badge'
import type { Status } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'

interface StatusBadgeProps {
  status: Status
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const variant = STATUS_COLORS[status] as 'success' | 'warning' | 'danger' | 'info' | 'default'
  return (
    <Badge variant={variant} size={size}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

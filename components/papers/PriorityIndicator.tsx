import { Badge } from '@/components/ui/Badge'
import type { Priority } from '@/lib/types'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/types'
import { AlertTriangle, ArrowDown, ArrowUp, Flame } from 'lucide-react'

const priorityIcons: Record<Priority, React.ReactNode> = {
  LOW: <ArrowDown size={10} />,
  MEDIUM: <ArrowUp size={10} />,
  HIGH: <AlertTriangle size={10} />,
  CRITICAL: <Flame size={10} />,
}

interface PriorityIndicatorProps {
  priority: Priority
  size?: 'sm' | 'md'
}

export function PriorityIndicator({ priority, size = 'sm' }: PriorityIndicatorProps) {
  const variant = PRIORITY_COLORS[priority] as 'success' | 'warning' | 'danger' | 'info' | 'default'
  return (
    <Badge variant={variant} size={size}>
      <span className="flex items-center gap-1">
        {priorityIcons[priority]}
        {PRIORITY_LABELS[priority]}
      </span>
    </Badge>
  )
}

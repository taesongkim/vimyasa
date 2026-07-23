import { useEffect, useState } from 'react'
import type { ItemStatus } from '../../../../../shared/types'

const statusStyles: Record<ItemStatus, string> = {
  default: 'bg-[var(--color-text-muted)]',
  active: 'bg-[var(--color-amber)]',
  pending: 'bg-[var(--color-amber)] status-dot-pending',
  complete: 'bg-[var(--color-green)]',
  hidden: 'opacity-0'
}

const statusLabels: Record<ItemStatus, string> = {
  default: 'Default',
  active: 'Active',
  pending: 'Pending',
  complete: 'Complete',
  hidden: 'Hidden'
}

export function StatusDot({
  status,
  size = 'sm',
  onClick
}: {
  status: ItemStatus
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  const [visible, setVisible] = useState(() => !document.hidden)

  useEffect(() => {
    const onVisibilityChange = (): void => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return (
    <button
      className="pr-1 shrink-0 no-drag flex items-center justify-center focus:outline-none"
      onClick={onClick}
      title={statusLabels[status]}
      tabIndex={-1}
    >
      <span
        className={`${dotSize} ${statusStyles[status]} ${status === 'pending' && !visible ? 'status-dot-pending-paused' : ''} rounded-full block transition-default hover:scale-125`}
      />
    </button>
  )
}

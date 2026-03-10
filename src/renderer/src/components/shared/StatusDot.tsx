import type { ItemStatus } from '../../../../../shared/types'

const statusColors: Record<ItemStatus, string> = {
  active: 'bg-green-500',
  done: 'bg-neutral-500',
  hold: 'bg-amber-500'
}

const statusLabels: Record<ItemStatus, string> = {
  active: 'Active',
  done: 'Done',
  hold: 'On Hold'
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
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  return (
    <button
      className={`${sizeClass} ${statusColors[status]} rounded-full shrink-0 no-drag transition-transform hover:scale-125 focus:outline-none`}
      onClick={onClick}
      title={statusLabels[status]}
      tabIndex={-1}
    />
  )
}

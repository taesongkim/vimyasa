import type { ItemStatus } from '../../../../../shared/types'

const statusStyles: Record<ItemStatus, string> = {
  active: 'bg-[var(--color-green)]',
  done: 'bg-[var(--color-text-muted)]',
  hold: 'bg-[var(--color-amber)]'
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
      className={`${sizeClass} ${statusStyles[status]} rounded-full shrink-0 no-drag transition-default hover:scale-125 focus:outline-none`}
      onClick={onClick}
      title={statusLabels[status]}
      tabIndex={-1}
    />
  )
}

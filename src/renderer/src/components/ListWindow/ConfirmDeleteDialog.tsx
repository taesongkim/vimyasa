import { useEffect, useRef } from 'react'

// Confirmation modal for permanent item deletion. Paired with the
// v0.1.8 Undo work — undo only handles archive / unarchive / edit /
// reorder / move, NOT permanent delete. The modal makes the
// destructive action explicit so the absence of undo isn't a foot-
// gun.
//
// Copy is locked from the dispatch brief (A1–A4):
//   A1 Title:          "Delete this item permanently?"
//   A2 Body:           "Heads up: this is permanent. Undo (Cmd+Z)
//                       won't bring it back."
//   A3 Confirm button: "Delete forever"
//   A4 Cancel button:  "Cancel"
//
// Modal traps focus on the Cancel button so Enter doesn't
// accidentally confirm the destructive action — the user has to
// move focus explicitly or click. Esc dismisses.

interface ConfirmDeleteDialogProps {
  itemText: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteDialog({
  itemText,
  onConfirm,
  onCancel
}: ConfirmDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Auto-focus Cancel so a stray Enter doesn't trigger Delete forever.
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Dismiss on Esc. stopPropagation so window-level Esc handlers
  // (focus stepdown, window close) don't fire too — closing the
  // modal is the one-step we want.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onCancel])

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--backdrop-dim)]"
      onMouseDown={(e) => {
        // Click on the backdrop dismisses; clicks inside the card
        // bubble through children handlers without dismissing.
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        className="no-drag flex flex-col gap-3 p-4 mx-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] max-w-[280px] shadow-[var(--shadow-panel)]"
      >
        <div className="flex flex-col gap-1">
          <div
            id="confirm-delete-title"
            className="text-[length:var(--font-size-base)] font-medium text-[color:var(--color-text-primary)]"
          >
            Delete this item permanently?
          </div>
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
            Heads up: this is permanent. Undo (⌘Z) won&apos;t
            bring it back.
          </div>
        </div>

        {/* Item text preview so the user sees what they're about to
            destroy. Single-line clamp keeps the modal compact even
            for long items. */}
        <div className="px-2 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-bg)] border border-[var(--color-border)] text-[length:var(--font-size-sm)] text-[color:var(--color-text-secondary)] truncate">
          {itemText}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="no-drag px-3 py-1.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default focus:outline-none focus:border-[var(--color-accent)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="no-drag px-3 py-1.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] font-medium bg-[var(--color-red)] border border-[var(--color-red)] text-white hover:opacity-90 transition-default focus:outline-none"
          >
            Delete forever
          </button>
        </div>
      </div>
    </div>
  )
}

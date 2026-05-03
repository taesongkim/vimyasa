import { StatusDot } from '../shared/StatusDot'
import type { Item, ItemStatus } from '../../../../../shared/types'

// Static visual representation of an ItemRow, rendered inside dnd-kit's
// <DragOverlay> so the dragged item is shown via a separate ghost
// element that follows the cursor — independent of the layout slot it's
// hovering over. Without this, the dragged item itself was the visual,
// and dnd-kit's sortable strategy would stretch/shrink it to fit the
// slot it was hovering over (since flex children inherit dimensions
// from their slot's computed flex layout).
//
// This is intentionally minimal — no edit mode, no drag handle, no
// hover affordances, no interaction. It's a snapshot. When the user
// drops, the actual ItemRow takes over again at the new sorted
// position. Width/dimensions come from dnd-kit's DragOverlay sizing
// the ghost to match the source.
//
// If the layout placeholders matter for visual continuity (so the
// width matches an ItemRow including its right-side action area),
// we mirror the same right-side placeholder strategy used by
// DraftItemRow — invisible button-shaped divs that take layout space.

const statusOpacity: Record<ItemStatus, number> = {
  active: 1,
  done: 0.6,
  hold: 0.35
}

export function DragGhost({ item }: { item: Item }) {
  return (
    <div
      // Slight shadow + raised feel to read as "lifted" while dragging.
      // bg-[var(--color-surface)] matches an idle ItemRow.
      className="group flex gap-1 px-3 py-2 mx-1 rounded cursor-grabbing bg-[var(--color-surface)] relative shadow-lg"
    >
      <div className="flex items-baseline gap-1 flex-1">
        <div className="-translate-y-0.5">
          <StatusDot status={item.status} />
        </div>
        <span
          className="flex-1 text-[length:var(--font-size-md)] [overflow-wrap:anywhere]"
          style={{ opacity: statusOpacity[item.status], lineHeight: '1.5rem' }}
        >
          {item.text}
        </span>
      </div>

      {/* Right-side layout placeholders — same dimensions as ItemRow's
          actions + drag handle, invisible. Keeps the ghost's overall
          width identical to the source ItemRow so there's no horizontal
          shift between the source's slot and the ghost. */}
      <div className="flex items-center gap-1 shrink-0 invisible" aria-hidden="true">
        <div className="p-1"><svg width="12" height="12" /></div>
        <div className="p-1"><svg width="12" height="12" /></div>
        <div className="p-1"><svg width="12" height="12" /></div>
      </div>
      <div className="invisible self-center" aria-hidden="true">
        <svg width="10" height="14" />
      </div>
    </div>
  )
}

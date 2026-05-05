import { useStore } from '../../store/useStore'

// Settings → Advanced. Opt-in visual / performance flags that aren't
// part of the default experience. Toggle markup mirrors the
// launch-at-login pill in GeneralTab so the two read as the same
// kind of control.

export function AdvancedTab() {
  const carryMotionBlur = useStore((s) => s.effects.carryMotionBlur)
  const setEffects = useStore((s) => s.setEffects)

  const toggleCarryMotionBlur = (): void => {
    void setEffects({ carryMotionBlur: !carryMotionBlur })
  }

  return (
    <div className="flex flex-col gap-3 px-1 py-3">
      {/* Motion blur on carry-mode send */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <div className="text-[length:var(--font-size-base)] font-medium">
            Motion blur on carry-mode send
          </div>
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
            Adds a directional motion-blur trail when sending an item to
            another list. Off by default.
          </div>
        </div>
        <button
          aria-pressed={carryMotionBlur}
          className={`shrink-0 mt-0.5 w-9 h-5 rounded-full transition-default relative ${
            carryMotionBlur ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
          }`}
          onClick={toggleCarryMotionBlur}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              carryMotionBlur ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

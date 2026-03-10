import { useState, useRef, useCallback } from 'react'

const modifierKeys = new Set(['Meta', 'Control', 'Alt', 'Shift'])

function keyToAccelerator(e: React.KeyboardEvent): string | null {
  // Must have at least one modifier
  if (!e.metaKey && !e.ctrlKey && !e.altKey) return null
  // Must have a non-modifier key
  if (modifierKeys.has(e.key)) return null

  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  // Normalize key names to Electron accelerator format
  let key = e.key
  if (key === ' ') key = 'Space'
  else if (key === 'ArrowUp') key = 'Up'
  else if (key === 'ArrowDown') key = 'Down'
  else if (key === 'ArrowLeft') key = 'Left'
  else if (key === 'ArrowRight') key = 'Right'
  else if (key.length === 1) key = key.toUpperCase()

  parts.push(key)
  return parts.join('+')
}

function formatAccelerator(accel: string): string {
  return accel
    .replace('CommandOrControl', '⌘')
    .replace('Alt', '⌥')
    .replace('Shift', '⇧')
    .replace(/\+/g, '')
}

export function KeyCapture({
  value,
  onChange,
  conflict
}: {
  value: string
  onChange: (accelerator: string) => void
  conflict?: 'none' | 'warn' | 'block'
}) {
  const [capturing, setCapturing] = useState(false)
  const [display, setDisplay] = useState(value ? formatAccelerator(value) : '')
  const inputRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const accel = keyToAccelerator(e)
      if (accel) {
        setDisplay(formatAccelerator(accel))
        onChange(accel)
        setCapturing(false)
        inputRef.current?.blur()
      }
    },
    [onChange]
  )

  const borderColor =
    conflict === 'block'
      ? 'border-[var(--color-red)]'
      : conflict === 'warn'
        ? 'border-[var(--color-amber)]'
        : capturing
          ? 'border-[var(--color-accent)]'
          : 'border-[var(--color-border)]'

  return (
    <div
      ref={inputRef}
      tabIndex={0}
      className={`px-2 py-1 rounded-[var(--radius-sm)] text-xs font-mono text-center min-w-[80px] cursor-pointer border transition-default outline-none ${borderColor} ${
        capturing
          ? 'bg-[var(--color-surface)] text-[var(--color-accent)]'
          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
      }`}
      onClick={() => {
        setCapturing(true)
        setDisplay('Press keys...')
        inputRef.current?.focus()
      }}
      onKeyDown={capturing ? handleKeyDown : undefined}
      onBlur={() => {
        if (capturing) {
          setCapturing(false)
          setDisplay(value ? formatAccelerator(value) : '')
        }
      }}
    >
      {display || 'Click to set'}
    </div>
  )
}

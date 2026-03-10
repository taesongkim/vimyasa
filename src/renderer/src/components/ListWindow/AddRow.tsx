import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { useStore } from '../../store/useStore'

export interface AddRowHandle {
  focus: () => void
}

export const AddRow = forwardRef<AddRowHandle, { listId: string }>(({ listId }, ref) => {
  const addItem = useStore((s) => s.addItem)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus()
  }))

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    await addItem(listId, trimmed)
    setText('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex items-center gap-2 px-1 py-2 border-t border-[var(--color-border)]">
      <span className="text-[color:var(--color-text-ghost)] text-[length:var(--font-size-md)]">+</span>
      <input
        ref={inputRef}
        className="flex-1 bg-transparent text-[length:var(--font-size-md)] text-[color:var(--color-text)] placeholder-[color:var(--color-text-ghost)] outline-none"
        placeholder="Add item..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
      />
    </div>
  )
})

AddRow.displayName = 'AddRow'

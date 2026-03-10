import { useState } from 'react'
import { useStore } from '../../store/useStore'

export function DataTab() {
  const [confirmReset, setConfirmReset] = useState(false)
  const refresh = useStore((s) => s.refresh)

  const handleExport = async () => {
    const data = await window.api.getAll()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vimyasa-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await window.api.importData?.(data)
        await refresh()
      } catch (err) {
        console.error('Import failed:', err)
      }
    }
    input.click()
  }

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
      return
    }
    await window.api.resetData?.()
    await refresh()
    setConfirmReset(false)
  }

  const handleRevealDataFile = () => {
    window.api.revealDataFile?.()
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Data file location */}
      <div>
        <div className="text-[13px] font-medium mb-1">Data File</div>
        <button
          className="text-xs text-[var(--color-accent)] hover:underline cursor-pointer"
          onClick={handleRevealDataFile}
        >
          ~/Library/Application Support/vimyasa/data.json
        </button>
        <div className="text-[10px] text-[var(--color-text-ghost)] mt-0.5">Click to reveal in Finder</div>
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Export */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium">Export Data</div>
          <div className="text-xs text-[var(--color-text-muted)]">Download a JSON backup</div>
        </div>
        <button
          className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={handleExport}
        >
          Export
        </button>
      </div>

      {/* Import */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium">Import Data</div>
          <div className="text-xs text-[var(--color-text-muted)]">Restore from a JSON backup</div>
        </div>
        <button
          className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={handleImport}
        >
          Import
        </button>
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Reset */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium text-[var(--color-red)]">Reset All Data</div>
          <div className="text-xs text-[var(--color-text-muted)]">Delete everything and start fresh</div>
        </div>
        <button
          className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-default ${
            confirmReset
              ? 'bg-[var(--color-red)] text-white'
              : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-red)] hover:bg-[var(--hover-highlight)]'
          }`}
          onClick={handleReset}
        >
          {confirmReset ? 'Click again to confirm' : 'Reset'}
        </button>
      </div>
    </div>
  )
}

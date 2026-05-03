// Lifecycle instrumentation for every BrowserWindow this app creates.
// Logs construction, ready-to-show, show, hide, focus, blur, and close
// events with bounds + visibility + opacity, all tagged with a stable
// short name (e.g. "list", "quickadd", "theme-dev-panel"). Only active in
// dev (gated by is.dev at the call site so production builds skip the
// listener overhead and the log noise).
//
// Why this exists: it's easy to introduce a stray window flicker when
// adding new prewarm patterns, modal flows, or onboarding overlays. A
// stub modal that briefly shows() before being positioned, an old
// BrowserWindow not being destroyed before recreation, an onboarding
// overlay firing on a wrong event — all leave a fingerprint in this log
// (a window appears with bounds you didn't expect, or a tag fires at a
// moment you didn't expect). When debugging "what's that flicker?",
// reproduce while watching the dev-server log and look for an unexpected
// `[win:<tag>] show` line.

import type { BrowserWindow } from 'electron'

function fmtBounds(win: BrowserWindow): string {
  if (win.isDestroyed()) return '<destroyed>'
  const b = win.getBounds()
  return `${b.x},${b.y} ${b.width}x${b.height}`
}

export function instrumentWindow(win: BrowserWindow, tag: string): void {
  const id = win.id
  const log = (event: string): void => {
    if (win.isDestroyed()) {
      console.log(`[win:${tag}#${id}] ${event} (destroyed)`)
      return
    }
    const visible = win.isVisible()
    const opacity = win.getOpacity().toFixed(2)
    console.log(
      `[win:${tag}#${id}] ${event} bounds=${fmtBounds(win)} visible=${visible} opacity=${opacity}`
    )
  }
  log('constructed')
  win.on('ready-to-show', () => log('ready-to-show'))
  win.on('show', () => log('show'))
  win.on('hide', () => log('hide'))
  win.on('focus', () => log('focus'))
  win.on('blur', () => log('blur'))
  win.on('closed', () => console.log(`[win:${tag}#${id}] closed`))
}

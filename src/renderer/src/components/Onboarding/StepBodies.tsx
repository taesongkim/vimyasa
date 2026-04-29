// Per-step JSX bodies, looked up by step id at render time.
// Kept renderer-only (this is a .tsx file) so the constants in
// src/shared/onboarding-steps.ts stay JSX-free and importable from main.

import type { ReactNode } from 'react'
import { VimyasaMark } from './VimyasaMark'

interface StepBodyProps {
  shortcuts: { quickAdd: string; openList: string; reference: string }
}

/** Convert an Electron accelerator string ("CommandOrControl+Shift+;") into
 *  a compact macOS display form ("⌘⇧;"). The renderer is mac-only for now,
 *  so we always use macOS glyphs. */
function fmt(accel: string): string {
  return accel
    .replace(/CommandOrControl/g, '⌘')
    .replace(/Command/g, '⌘')
    .replace(/Control/g, 'Ctrl')
    .replace(/Shift/g, '⇧')
    .replace(/Alt|Option/g, '⌥')
    .replace(/\+/g, '')
}

/** A keyboard-shortcut chip — matches the prototype's `.key` styling
 *  (SF Mono on a faint blue tint). */
function Key({ children }: { children: ReactNode }): ReactNode {
  return <span className="onb-key">{children}</span>
}

export function getStepBody(stepId: string, props: StepBodyProps): ReactNode {
  const { shortcuts } = props

  switch (stepId) {
    case 'welcome':
      return (
        <>
          <p>
            Press <strong className="onb-emphasis">Start Tour</strong> below to
            get acquainted with the flow of things, or{' '}
            <strong className="onb-emphasis">Skip</strong> to dive right in.
          </p>
          <p>
            You can revisit this tour any time from Settings in the menubar
            tray icon.
          </p>
        </>
      )

    case 'capture':
      return (
        <>
          <p>
            Press <Key>{fmt(shortcuts.quickAdd)}</Key> from anywhere to summon
            the Entry Form.
          </p>
          <p>
            Go ahead and try it — the form will open right below this callout.
          </p>
        </>
      )

    case 'capture-add':
      return (
        <>
          <p>
            Type your idea, hit <Key>Enter</Key>, and boom. Back to whatever
            you were doing.
          </p>
          <p>
            For this demo, enter three ideas (e.g. "Journal about yesterday's
            conversation", "Fix the color bug", "Text Raye back"…).
          </p>
          <p>
            Reminder: the shortcut for the Entry Form is{' '}
            <Key>{fmt(shortcuts.quickAdd)}</Key>.
          </p>
        </>
      )

    case 'navigate':
      return (
        <>
          <p>
            Press <Key>{fmt(shortcuts.openList)}</Key> from anywhere to open
            your list.
          </p>
          <p>The three items you just captured will be waiting.</p>
        </>
      )

    case 'navigate-actions':
      return (
        <ul className="onb-actions-list">
          <li>
            <Key>j / k</Key>
            <span>Navigate items</span>
          </li>
          <li>
            <Key>Space</Key>
            <span>Cycle status (active → wait → ignore)</span>
          </li>
          <li>
            <Key>a</Key>
            <span>
              <span className="onb-mnem">A</span>rchive ·{' '}
              <Key>Enter</Key> also archives
            </span>
          </li>
          <li>
            <Key>c</Key>
            <span>
              <span className="onb-mnem">C</span>opy item text
            </span>
          </li>
          <li>
            <Key>o</Key>
            <span>
              <span className="onb-mnem">O</span>pen comments / notes
            </span>
          </li>
          <li>
            <Key>n</Key>
            <span>
              Add <span className="onb-mnem">n</span>ew item from here
            </span>
          </li>
          <li>
            <Key>Esc</Key>
            <span>Back or Exit</span>
          </li>
        </ul>
      )

    case 'tray':
      return (
        <p>
          <span style={{ whiteSpace: 'nowrap' }}>
            Click the <VimyasaMark size={21} /> icon
          </span>{' '}
          in the menubar for everything else: create new lists, change
          shortcuts, or replay this tour.
        </p>
      )

    case 'lists':
      return (
        <>
          <p>
            Once you have more than one list, you can cycle between them in
            different contexts with Tab:
          </p>
          <ul className="onb-actions-list">
            <li>
              <Key>Tab</Key>
              <span>While in Entry Form: Cycle target list</span>
            </li>
            <li>
              <Key>Tab</Key>
              <span>While in List Window: Cycle visible list</span>
            </li>
            <li>
              <Key>1–9</Key>
              <span>While in List Window: jump straight to desired list</span>
            </li>
          </ul>
          <p>List numbers match the order in Settings → Lists.</p>
        </>
      )

    case 'escape':
      return (
        <>
          <p>
            The <Key>Esc</Key> key works in most contexts — deselect a focused
            item, close any window, or cancel an edit.
          </p>
          <p>It's generally pretty intuitive.</p>
        </>
      )

    case 'done':
      return (
        <>
          <p>
            Press <Key>{fmt(shortcuts.reference)}</Key> any time for the full
            shortcut reference.
          </p>
          <p>
            Spot a bug or have an idea? Shoot me a message — would love to know
            what you think.
          </p>
        </>
      )

    default:
      return null
  }
}

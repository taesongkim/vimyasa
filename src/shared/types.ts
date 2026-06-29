import type { ThemesAPI, ThemeDevAPI, ThemeEventsAPI, ThemesState, QuickAddAPI } from './themes'

// ── Data Model Types ──────────────────────────────────────────────

export type ItemStatus = 'active' | 'done' | 'hold'

export type ShortcutAction = 'openList' | 'quickAddFixed' | 'cycleAllLists'

export interface Group {
  id: string
  name: string
  listIds: string[]
  sortOrder: number
}

export type ListKind = 'regular' | 'hot'

/** Stable, well-known id for the always-existing hot list. The user's
 *  daily-completion surface (proposed in docs/proposals/hot-list.md).
 *  Reserved string — do not generate this id elsewhere. */
export const HOT_LIST_ID = 'hot' as const

export interface List {
  id: string
  groupId: string
  name: string
  /** 'hot' is reserved for the single always-existing hot list (id =
   *  HOT_LIST_ID). All user-created lists are 'regular'. The kind is
   *  immutable per list — a regular list never becomes hot and vice
   *  versa. Filter helpers in this module gate user-facing iteration
   *  so the hot list doesn't accidentally show up in tray menus,
   *  number-key bindings, etc., before its dedicated UI lands. */
  kind: ListKind
  sortOrder: number
}

/** User-facing lists (everything except the hot list). Use this anywhere
 *  the user iterates "their lists" — tray menu, number-key bindings,
 *  list dropdowns, settings rosters.
 *
 *  Filters by NOT being hot (rather than IS regular) so a list whose
 *  kind hasn't been backfilled yet — e.g. a v0.1.5 backup imported
 *  before the import-side normalization lands — defaults to user-
 *  visible rather than vanishing from the UI. */
export function getRegularLists(lists: List[]): List[] {
  return lists.filter((l) => l.kind !== 'hot')
}

/** The single hot list, or undefined if the seed migration hasn't run
 *  yet (shouldn't happen in normal operation). */
export function getHotList(lists: List[]): List | undefined {
  return lists.find((l) => l.kind === 'hot')
}

export interface Item {
  id: string
  listId: string
  text: string
  status: ItemStatus
  sortOrder: number
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface Comment {
  id: string
  itemId: string
  parentId: string | null
  text: string
  createdAt: string
  updatedAt: string
}

export interface Shortcut {
  id: string
  action: ShortcutAction
  targetId?: string | null
  accelerator: string
}

export interface BuiltinShortcuts {
  openFirstList: string
  quickAddFirst: string
}

export const DEFAULT_BUILTIN_SHORTCUTS: BuiltinShortcuts = {
  openFirstList: 'CommandOrControl+Shift+L',
  quickAddFirst: 'CommandOrControl+Shift+;'
}

export type JkMode = 'standard' | 'inverse'

// ── Effects (Settings → Advanced) ───────────────────────────────
// Opt-in visual effects that aren't part of the default look. The
// shape is open-ended so future toggles (anything aesthetics ships
// behind a switch) slot in here without a schema migration each
// time. Default values live in store.ts defaults + the runtime seed.

export interface Effects {
  /** Adds a directional trailing motion blur to the carry-mode send
   *  animation. OFF by default — flipped from ON during v0.1.6 dev
   *  verification (text quality degradation from CSS `filter: url(...)`
   *  off-screen rendering was noticeable enough that opt-in is the
   *  right default). The polish is still available — Settings →
   *  Advanced has the toggle. May flip back to default-on in a
   *  future version once the rendering issue is resolved (filter
   *  scoped tighter, or a different effect technique). See INBOX
   *  2026-05-05 for the original tunables. */
  carryMotionBlur: boolean
}

export const DEFAULT_EFFECTS: Effects = {
  carryMotionBlur: false
}

// ── Feedback messenger ───────────────────────────────────────────
// User-visible config (clientId is opaque, exposed for PR 2's send
// payload). PR 1 ships the storage + Settings tab; PR 2 builds the
// send flow and consumes `canSend` / `recordSend`.

export interface FeedbackConfig {
  clientId: string
  senderName: string
  dailyLimit: number
}

export interface FeedbackCanSendResult {
  canSend: boolean
  sendsToday: number
  limit: number
}

export type FeedbackSendOutcome =
  | { ok: true }
  | {
      ok: false
      code: 'invalid' | 'rate-limit' | 'network-error'
      sendsToday?: number
      limit?: number
    }

export interface FeedbackAPI {
  getConfig: () => Promise<FeedbackConfig>
  setConfig: (
    updates: Partial<Pick<FeedbackConfig, 'senderName' | 'dailyLimit'>>
  ) => Promise<FeedbackConfig>
  canSend: () => Promise<FeedbackCanSendResult>
  recordSend: () => Promise<void>
  /** POST the message to the Worker (composes payload in main, see
   *  feedback-send.ts). Renderer awaits this from the feedback window's
   *  Send handler. Recording the timestamp happens server-side of this
   *  call (in main, only on success). */
  send: (message: string) => Promise<FeedbackSendOutcome>
  /** Hide the prewarmed feedback window. Mirrors quickAdd.hide — sends
   *  'feedback:hidden' before win.hide() so the renderer can unmount
   *  the form before the next show paints. */
  hide: () => Promise<void>
  /** Fires every time the feedback window is summoned. Renderer resets
   *  state + replays the entrance animation. */
  onShow: (callback: () => void) => () => void
  /** Fires when the window is hiding (authoritative; document
   *  visibilitychange in the renderer is also wired as a fallback). */
  onHidden: (callback: () => void) => () => void
}

export interface DataStore {
  schemaVersion: number
  groups: Group[]
  lists: List[]
  items: Item[]
  comments: Comment[]
  shortcuts: Shortcut[]
  builtinShortcuts: BuiltinShortcuts
  // 'standard' = j down, k up (vim convention).
  // 'inverse'  = j up, k down.
  jkMode: JkMode
  // Opt-in visual effects (Settings → Advanced).
  effects: Effects
}

// ── IPC API Types ─────────────────────────────────────────────────

export interface VimyasaAPI {
  // Lifecycle
  ping: () => Promise<string>

  // Data — read
  getAll: () => Promise<DataStore>

  // Groups
  createGroup: (name: string) => Promise<Group>
  updateGroup: (id: string, updates: Partial<Pick<Group, 'name' | 'listIds' | 'sortOrder'>>) => Promise<Group>
  deleteGroup: (id: string) => Promise<void>

  // Lists
  createList: (groupId: string, name: string) => Promise<List>
  updateList: (id: string, updates: Partial<Pick<List, 'name' | 'sortOrder'>>) => Promise<List>
  deleteList: (id: string) => Promise<void>

  // Items
  createItem: (listId: string, text: string, clientId?: string) => Promise<Item>
  updateItem: (id: string, updates: Partial<Pick<Item, 'text' | 'status' | 'listId' | 'sortOrder' | 'archivedAt'>>) => Promise<Item>
  deleteItem: (id: string) => Promise<void>
  setItemStatus: (id: string, status: ItemStatus) => Promise<Item>
  moveItem: (id: string, targetListId: string) => Promise<Item>
  /** Reorder items. When `silent` is true, the reorder does NOT push
   *  an undo entry — used by carry-mode j/k where the whole session
   *  captures one aggregate entry on commit. */
  reorderItems: (listId: string, orderedIds: string[], silent?: boolean) => Promise<void>

  // Comments
  createComment: (itemId: string, text: string, parentId?: string | null) => Promise<Comment>
  updateComment: (id: string, text: string) => Promise<Comment>
  deleteComment: (id: string) => Promise<void>

  // Shortcuts
  getShortcuts: () => Promise<Shortcut[]>
  createShortcut: (action: ShortcutAction, accelerator: string, targetId?: string | null) => Promise<Shortcut>
  updateShortcut: (id: string, updates: Partial<Pick<Shortcut, 'action' | 'accelerator' | 'targetId'>>) => Promise<Shortcut>
  deleteShortcut: (id: string) => Promise<void>

  // Built-in Shortcuts
  getBuiltinShortcuts: () => Promise<BuiltinShortcuts>
  updateBuiltinShortcuts: (updates: Partial<BuiltinShortcuts>) => Promise<BuiltinShortcuts>

  // J/K mapping mode
  setJkMode: (mode: JkMode) => Promise<JkMode>

  // Effects (Settings → Advanced). Partial update so callers can
  // toggle individual flags without round-tripping the whole object.
  setEffects: (updates: Partial<Effects>) => Promise<Effects>

  // Shortcut capture
  pauseGlobalShortcuts: () => Promise<void>
  resumeGlobalShortcuts: () => Promise<void>

  // Window
  closeWindow: () => Promise<void>
  openListWindow: (listId: string, position?: { x: number; y: number }) => Promise<void>
  openQuickAdd: (variant: 'fixed' | 'select', targetListId?: string) => Promise<void>
  openComments: (itemId: string) => Promise<void>
  openSettings: (tab?: 'general' | 'lists' | 'shortcuts' | 'themes' | 'feedback' | 'data') => Promise<void>
  openArchive: (listId?: string) => Promise<void>
  openShortcutsOverview: () => Promise<void>
  showContextMenu: (template: any[]) => Promise<void>

  // Events
  onDataChanged: (callback: () => void) => () => void
  /** Generic "an item just landed in this list" subscription. Fires
   *  on every cross-list move (today: moveItem; future: drag-
   *  between-lists, bulk ops). Payload includes the source/target
   *  list ids and the direction the source flew (right = up the
   *  order, left = down). Receivers typically filter by active
   *  listId === toListId before firing the receipt pulse + scroll
   *  the new item into view. */
  onItemArrived: (
    callback: (payload: {
      itemId: string
      fromListId: string
      toListId: string
      direction: 'left' | 'right'
    }) => void
  ) => () => void
  /** Subscribe to clicks on items in a previously-shown context menu.
   *  Main re-broadcasts the chosen action (with the ipcData payload the
   *  caller attached to the template entry) over `context-menu-action`.
   *  Returns an unsubscribe function. */
  onContextMenuAction: (callback: (data: { action: string; itemId?: string; status?: string; listId?: string }) => void) => () => void

  // System
  openExternal: (url: string) => Promise<void>
  revealDataFile: () => Promise<void>
  getLoginItemSettings: () => Promise<{ openAtLogin: boolean }>
  setLoginItemSettings: (openAtLogin: boolean) => Promise<void>
  /** App metadata for Settings → About. Always returns version + isDev +
   *  electronVersion; gitBranch/gitSha are populated only in dev builds
   *  (production binaries skip the git shell-out — git isn't reliably
   *  present, and version alone is enough there). */
  getAppInfo: () => Promise<{
    version: string
    isDev: boolean
    electronVersion: string
    gitBranch: string | null
    gitSha: string | null
  }>
  importData: (data: DataStore) => Promise<void>
  resetData: () => Promise<void>

  // Onboarding
  onboarding: OnboardingAPI

  // Themes (production settings, exposed in Settings → Themes)
  themes: ThemesAPI

  // Theme dev panel (gated by is.dev — never call from production builds)
  themeDev: ThemeDevAPI

  // Theme event triggers — IPC-broadcast events fire surface pulses
  themeEvents: ThemeEventsAPI

  // Pre-warmed QuickAdd window — show/hide replaces the destroy/recreate path
  quickAdd: QuickAddAPI

  // Feedback messenger — PR 1 ships config + clientId; PR 2 adds send flow
  feedback: FeedbackAPI

  // Undo / redo (v0.1.8). In-memory cross-window log; main is the
  // source of truth, renderer mirrors via onChanged.
  undo: UndoAPI

  // Auto-update prompt (v0.1.8 — release-notes-in-update). Custom
  // in-app window replaced the native dialog so we can render the
  // GitHub release notes markdown inline.
  update: UpdateAPI
}

// ── Auto-update prompt ──────────────────────────────────────────

export interface UpdatePromptPayload {
  /** 'available' = electron-updater found a new version; show
   *  Install Now / Later. 'downloaded' = download finished;
   *  show Restart Now / Later + release notes. */
  phase: 'available' | 'downloaded'
  version: string
  /** Concatenated markdown body of every release the user hasn't
   *  installed yet, latest at top. Empty string if the GitHub
   *  release had no body. */
  releaseNotes: string
}

export interface UpdateAPI {
  /** Subscribe to push from main. Fires every time the prompt window
   *  should show a (new) payload — both phases route through here. */
  onShow: (callback: (payload: UpdatePromptPayload) => void) => () => void
  /** Pull-style read for the renderer on mount. Covers the race
   *  where main pushed `update:show` before the renderer's useEffect
   *  subscribed. */
  getPending: () => Promise<UpdatePromptPayload | null>
  /** User chose Install Now from the 'available' prompt. */
  install: () => Promise<void>
  /** User chose Restart Now from the 'downloaded' prompt. */
  restart: () => Promise<void>
  /** User chose Later, clicked the backdrop, or hit Esc. */
  dismiss: () => Promise<void>
  /** Dev-only escape hatch — packaged builds no-op. Lets a renderer
   *  summon a mock prompt with hand-crafted data so the window can
   *  be verified without a real update being available. */
  testShow: (payload: UpdatePromptPayload) => Promise<void>
  /** Renderer-driven adaptive height. Renderer measures its content
   *  via ResizeObserver and asks main to match (clamped to a sane
   *  range). Mirrors the onboarding callout's request-resize pattern. */
  requestResize: (height: number) => Promise<void>
}

// ── Undo / redo ─────────────────────────────────────────────────

export interface UndoSnapshot {
  /** Number of entries currently in the undo log (0..MAX_DEPTH). */
  undoDepth: number
  /** Number of entries currently in the redo stack (0..MAX_DEPTH). */
  redoDepth: number
}

export interface UndoApplyResult {
  /** Item id the inverse touched (when knowable). Renderer can
   *  scroll the row into view + move focus to it. `null` for entry
   *  kinds where multiple items shift (e.g. reorder). */
  affectedItemId: string | null
}

export interface UndoAPI {
  /** Pull current snapshot. Used on mount to backfill any window
   *  that came up after the most recent broadcast. */
  get: () => Promise<UndoSnapshot>
  /** Pop the most recent undo entry + apply its inverse. Returns
   *  null if the log was empty. */
  performUndo: () => Promise<UndoApplyResult | null>
  /** Symmetric counterpart to performUndo. */
  performRedo: () => Promise<UndoApplyResult | null>
  /** Manually push an aggregate 'reorder' entry without mutating the
   *  store. Used by carry-mode commit (Enter / Esc land) to record
   *  the whole-session move as a single undo step — the per-j/k
   *  reorders themselves use `reorderItems(silent=true)` to avoid
   *  flooding the log. */
  pushReorderEntry: (
    listId: string,
    oldOrder: string[],
    newOrder: string[]
  ) => Promise<void>
  /** Fires whenever the undo / redo depths change. Renderer Zustand
   *  store mirrors via this subscription (same pattern as
   *  themes.onChanged). */
  onChanged: (callback: (snapshot: UndoSnapshot) => void) => () => void
}

export interface OnboardingCalloutPayload {
  stepId: string
  step: number
  welcome: boolean
  subStep: boolean
  label: string
  title: string
  autoAdvanceHint: string | null
  successAction: string | null
  mainStepIndex: number
  totalMain: number
  itemsAddedCount: number
  shortcuts: { quickAdd: string; openList: string; reference: string }
}

export interface OnboardingState {
  active: boolean
  stepId: string | null
}

export interface OnboardingAPI {
  advance: () => Promise<void>
  back: () => Promise<void>
  close: () => Promise<void>
  replay: () => Promise<void>
  getState: () => Promise<OnboardingCalloutPayload | null>
  requestResize: (height: number) => Promise<void>
  dismissDim: () => Promise<void>
  onShowStep: (callback: (payload: OnboardingCalloutPayload) => void) => () => void
  onItemsProgress: (callback: (count: number) => void) => () => void
  onState: (callback: (state: OnboardingState) => void) => () => void
  /** Fires every time the dim window is shown (initial tour or replay).
   *  Used by the dim renderer to defer mounting heavy DOM (the dot grid)
   *  until the window is actually visible, so CSS animations start fresh
   *  in a visible context. */
  onDimShown: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api: VimyasaAPI
    /** Snapshot of the persisted themes state injected by the preload
     *  script via `additionalArguments`. Available synchronously on first
     *  render. Null only if main's argv flag was missing or malformed
     *  (shouldn't happen in normal operation; see preload/index.ts). */
    themesInitial: ThemesState | null
  }
}

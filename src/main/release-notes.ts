import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

// Fetches the GitHub Release body for the *currently installed*
// version so the Settings → About tab can answer "what was in the
// version I'm on?" — the auto-updater only surfaces notes for
// versions NEWER than the installed one, never the current one.
//
// Source is the same public repo electron-updater pulls from
// (owner/repo mirror the setFeedURL + electron-builder.yml publish
// config). Unauthenticated GitHub API: 60 requests/hour/IP, which is
// plenty because we cache the body per version on disk — a shipped
// version's notes never change, so it's a once-ever fetch per version
// per machine, and cached reads work offline.

const OWNER = 'taesongkim'
const REPO = 'vimyasa'

function cachePath(): string {
  return join(app.getPath('userData'), 'release-notes-cache.json')
}

function readCache(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(cachePath(), 'utf8')) as Record<string, string>
  } catch {
    // Missing / unreadable / malformed cache — treat as empty.
    return {}
  }
}

function writeCache(cache: Record<string, string>): void {
  try {
    mkdirSync(app.getPath('userData'), { recursive: true })
    writeFileSync(cachePath(), JSON.stringify(cache), 'utf8')
  } catch (err) {
    // Non-fatal: a failed cache write just means we refetch next time.
    console.error('[release-notes] cache write failed:', err)
  }
}

export interface CurrentReleaseNotes {
  version: string
  /** Markdown body of the current version's GitHub release.
   *   - non-empty string → render it
   *   - '' (empty)       → release exists but has no body
   *   - null             → couldn't load (offline, 404 on an
   *                        unreleased/dev version, or API error) */
  notes: string | null
}

export async function getCurrentReleaseNotes(): Promise<CurrentReleaseNotes> {
  const version = app.getVersion()

  const cache = readCache()
  // Cache hit — including a cached empty body ('' is a valid, distinct
  // "release has no notes" result, so check for presence, not truthiness).
  if (Object.prototype.hasOwnProperty.call(cache, version)) {
    return { version, notes: cache[version] }
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/v${version}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          // GitHub requires a User-Agent on API requests.
          'User-Agent': REPO
        }
      }
    )
    if (!res.ok) {
      // 404 is expected for a dev build on a version that isn't
      // released yet; any non-2xx → treat as "couldn't load".
      return { version, notes: null }
    }
    const data = (await res.json()) as { body?: string | null }
    const body = (data.body ?? '').trim()
    cache[version] = body
    writeCache(cache)
    return { version, notes: body }
  } catch (err) {
    console.error('[release-notes] fetch failed:', err)
    return { version, notes: null }
  }
}

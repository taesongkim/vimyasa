import type { VimyasaAPI } from '../shared/types'

declare global {
  interface Window {
    api: VimyasaAPI
  }
}

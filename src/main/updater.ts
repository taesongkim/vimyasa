import { app, dialog } from 'electron'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

export function setupAutoUpdater(): void {
  if (!app.isPackaged) return

  const token = process.env.VIMYASA_UPDATE_TOKEN
  if (!token) {
    console.warn('[updater] VIMYASA_UPDATE_TOKEN not set; auto-update disabled')
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'taesongkim',
    repo: 'vimyasa',
    private: true,
    token
  })

  autoUpdater.on('update-available', async (info) => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Install Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Vimyasa update available',
      message: `Vimyasa ${info.version} is available.`,
      detail: 'Would you like to download it now? You can keep using the app while it downloads.'
    })
    if (response === 0) {
      autoUpdater.downloadUpdate().catch((err) => {
        console.error('[updater] downloadUpdate failed:', err)
      })
    }
  })

  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Vimyasa update ready',
      message: `Vimyasa ${info.version} has been downloaded.`,
      detail: 'Restart the app to apply the update.'
    })
    if (response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
  })

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] initial check failed:', err)
  })
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] interval check failed:', err)
    })
  }, FOUR_HOURS_MS)
}

import { writeFile } from 'fs/promises'
import { BrowserWindow } from 'electron'

/**
 * Convert a fully-rendered HTML document to a high-fidelity PDF.
 *
 * The Build Plan (§8.2) specifies Puppeteer; we use Electron's built-in
 * `webContents.printToPDF`, which drives the exact same bundled Chromium engine
 * with no extra dependency. The HTML is loaded from an in-memory data URL — no
 * temp file containing report data is ever written to disk (§10.4). The only disk
 * write is the user-chosen export path.
 */
export async function writePdf(html: string, savePath: string): Promise<void> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, javascript: false }
  })
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    // Give web fonts / layout a beat to settle before snapshotting.
    await new Promise((r) => setTimeout(r, 250))
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
    })
    await writeFile(savePath, pdf)
  } finally {
    win.destroy()
  }
}

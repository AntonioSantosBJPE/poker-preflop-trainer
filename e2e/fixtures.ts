import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ElectronApplication, Page } from 'playwright'
import { test as base, expect, _electron as electron } from '@playwright/test'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

export const test = base.extend<{ appPage: Page }>({
  appPage: async ({}, use) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-e2e-'))
    const userData = path.join(tmp, 'userData')
    const tokenFile = path.join(tmp, 'jwt')
    fs.mkdirSync(userData, { recursive: true })

    const mainJs = path.join(root, 'out/main/index.js')
    if (!fs.existsSync(mainJs)) {
      throw new Error(`Falta build da app: ${mainJs} não existe. Corra: pnpm build:app`)
    }

    let electronApp: ElectronApplication | null = null
    try {
      electronApp = await electron.launch({
        args: [mainJs],
        cwd: root,
        env: {
          ...process.env,
          PT_E2E_USER_DATA: userData,
          PT_E2E_TOKEN_FILE: tokenFile
        }
      })
      const page = await electronApp.firstWindow()
      await page.waitForLoadState('domcontentloaded')
      await use(page)
    } finally {
      await electronApp?.close()
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  }
})

export { expect }

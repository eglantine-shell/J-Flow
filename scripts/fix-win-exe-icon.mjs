import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const findRcedit = (root) => {
  const stack = [root]

  while (stack.length > 0) {
    const current = stack.pop()

    if (!current) {
      continue
    }

    let entries

    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name)

      if (entry.isFile() && entry.name.toLowerCase() === 'rcedit.exe') {
        return entryPath
      }

      if (entry.isDirectory()) {
        stack.push(entryPath)
      }
    }
  }

  return null
}

export default async function fixWinExeIcon(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const projectDir = context.packager.projectDir
  const iconPath = path.join(projectDir, 'build', 'icon.ico')
  const executableName = `${context.packager.appInfo.productFilename}.exe`
  const executablePath = path.join(context.appOutDir, executableName)

  if (!existsSync(iconPath)) {
    throw new Error(`Windows icon not found: ${iconPath}`)
  }

  if (!existsSync(executablePath)) {
    throw new Error(`Windows executable not found: ${executablePath}`)
  }

  const rceditPath = findRcedit(path.join(projectDir, 'node_modules'))

  if (!rceditPath) {
    throw new Error('rcedit.exe not found in node_modules')
  }

  execFileSync(rceditPath, [executablePath, '--set-icon', iconPath], {
    stdio: 'inherit',
  })
}

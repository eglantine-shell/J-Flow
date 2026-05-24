import { copyFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDirectory, '..')
const sourceIcon = path.join(projectRoot, 'J-Flow.PNG')
const buildDirectory = path.join(projectRoot, 'build')
const targetIcon = path.join(buildDirectory, 'icon.png')
const targetWindowsIcon = path.join(buildDirectory, 'icon.ico')
const windowsIconScript = path.join(currentDirectory, 'generate-icon-win.ps1')

await mkdir(buildDirectory, { recursive: true })

if (process.platform === 'win32') {
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      windowsIconScript,
      '-SourceIcon',
      sourceIcon,
      '-TargetPng',
      targetIcon,
      '-TargetIco',
      targetWindowsIcon,
    ],
    { stdio: 'inherit' },
  )
  process.exit(0)
}

await copyFile(sourceIcon, targetIcon)
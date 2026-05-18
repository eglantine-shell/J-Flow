import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDirectory, '..')
const sourceIcon = path.join(projectRoot, 'J-Flow.PNG')
const buildDirectory = path.join(projectRoot, 'build')
const targetIcon = path.join(buildDirectory, 'icon.png')

await mkdir(buildDirectory, { recursive: true })
await copyFile(sourceIcon, targetIcon)

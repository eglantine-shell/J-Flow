import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { SyncTargetDriver, SyncTargetEntry } from './types.js'

const ensureSafeLogicalPath = (logicalPath: string, allowEmpty = false) => {
  if (logicalPath.includes('\\')) {
    throw new Error('logicalPath 必须使用 POSIX 风格路径，不能包含反斜杠。')
  }

  if (!allowEmpty && logicalPath.length === 0) {
    throw new Error('logicalPath 不能为空。')
  }

  if (path.posix.isAbsolute(logicalPath)) {
    throw new Error('logicalPath 不能是绝对路径。')
  }

  const normalized = path.posix.normalize(logicalPath)

  if (normalized === '.' && allowEmpty) {
    return ''
  }

  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new Error('logicalPath 不能逃逸同步目录。')
  }

  const segments = normalized.split('/').filter(Boolean)

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('logicalPath 不能包含 . 或 .. 段。')
  }

  return segments.join('/')
}

export const resolveLocalFolderPath = (basePath: string, logicalPath: string) => {
  const normalizedLogicalPath = ensureSafeLogicalPath(logicalPath, true)
  const resolvedBasePath = path.resolve(basePath)
  const resolvedTargetPath = path.resolve(resolvedBasePath, normalizedLogicalPath)

  if (
    resolvedTargetPath !== resolvedBasePath &&
    !resolvedTargetPath.startsWith(`${resolvedBasePath}${path.sep}`)
  ) {
    throw new Error('logicalPath 不能逃逸同步目录。')
  }

  return resolvedTargetPath
}

const listEntriesRecursive = async (
  absoluteDirectoryPath: string,
  relativePrefix: string,
): Promise<SyncTargetEntry[]> => {
  const dirEntries = await readdir(absoluteDirectoryPath, { withFileTypes: true })
  const results: SyncTargetEntry[] = []

  for (const dirEntry of dirEntries) {
    const entryLogicalPath = relativePrefix
      ? path.posix.join(relativePrefix, dirEntry.name)
      : dirEntry.name
    const entryAbsolutePath = path.join(absoluteDirectoryPath, dirEntry.name)

    if (dirEntry.isDirectory()) {
      results.push({
        logicalPath: entryLogicalPath,
        kind: 'directory',
      })
      results.push(...(await listEntriesRecursive(entryAbsolutePath, entryLogicalPath)))
      continue
    }

    const entryStats = await stat(entryAbsolutePath)
    results.push({
      logicalPath: entryLogicalPath,
      kind: 'file',
      updatedAt: entryStats.mtime.toISOString(),
      size: entryStats.size,
    })
  }

  return results
}

const safeWriteJsonAtomic = async (filePath: string, data: unknown) => {
  const directoryPath = path.dirname(filePath)
  const tmpPath = `${filePath}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`
  const content = `${JSON.stringify(data, null, 2)}\n`

  await mkdir(directoryPath, { recursive: true })
  await writeFile(tmpPath, content, 'utf8')
  await rename(tmpPath, filePath)
}

export class LocalFolderDriver implements SyncTargetDriver {
  readonly type = 'localFolder' as const

  constructor(private readonly basePath: string) {}

  readText(logicalPath: string) {
    return readFile(resolveLocalFolderPath(this.basePath, logicalPath), 'utf8')
  }

  async writeText(logicalPath: string, content: string) {
    const absolutePath = resolveLocalFolderPath(this.basePath, logicalPath)
    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, content, 'utf8')
  }

  async delete(logicalPath: string) {
    await rm(resolveLocalFolderPath(this.basePath, logicalPath), { recursive: true, force: true })
  }

  async list(logicalPrefix: string) {
    const normalizedPrefix = ensureSafeLogicalPath(logicalPrefix, true)
    const absolutePrefixPath = resolveLocalFolderPath(this.basePath, normalizedPrefix)
    const prefixStats = await stat(absolutePrefixPath).catch(() => null)

    if (!prefixStats || !prefixStats.isDirectory()) {
      return []
    }

    return listEntriesRecursive(absolutePrefixPath, normalizedPrefix)
  }

  async exists(logicalPath: string) {
    return Boolean(await stat(resolveLocalFolderPath(this.basePath, logicalPath)).catch(() => null))
  }

  async ensureDir(logicalPath: string) {
    await mkdir(resolveLocalFolderPath(this.basePath, logicalPath), { recursive: true })
  }

  safeWriteJson(logicalPath: string, data: unknown) {
    return safeWriteJsonAtomic(resolveLocalFolderPath(this.basePath, logicalPath), data)
  }
}

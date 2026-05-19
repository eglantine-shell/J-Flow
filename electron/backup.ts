import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getSqliteAppData } from './sqlite.js'

const AUTO_BACKUP_DIRECTORY_NAME = 'backups'
const AUTO_BACKUP_PREFIX = 'j-flow-auto-backup-'
const AUTO_BACKUP_EXTENSION = '.json'
const AUTO_BACKUP_LIMIT = 20

type AutoBackupInfo = {
  directory: string
  backupCount: number
  latestBackupAt: string | null
}

type AutoBackupClock = {
  now: () => Date
}

type CreateAutoBackupOptions = {
  skipIfBackupExistsForToday?: boolean
  clock?: AutoBackupClock
}

const pad = (value: number) => String(value).padStart(2, '0')

const formatDatePart = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`

const formatTimestamp = (date: Date) =>
  `${formatDatePart(date)}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`

const getAutoBackupDirectory = (dataPath: string) =>
  path.join(dataPath, AUTO_BACKUP_DIRECTORY_NAME)

const ensureAutoBackupDirectory = async (dataPath: string) => {
  const directory = getAutoBackupDirectory(dataPath)

  await mkdir(directory, { recursive: true })

  return directory
}

const isAutoBackupFilename = (filename: string) =>
  filename.startsWith(AUTO_BACKUP_PREFIX) && filename.endsWith(AUTO_BACKUP_EXTENSION)

const toAutoBackupPath = (directory: string, filename: string) => path.join(directory, filename)

const getAutoBackupFilenames = async (directory: string) => {
  const filenames = await readdir(directory)

  return filenames.filter(isAutoBackupFilename).sort()
}

const parseBackupTimestamp = (filename: string) => {
  const timestamp = filename
    .replace(AUTO_BACKUP_PREFIX, '')
    .replace(AUTO_BACKUP_EXTENSION, '')
  const [datePart, timePart] = timestamp.split('-')

  if (!datePart || !timePart || datePart.length !== 8 || timePart.length !== 6) {
    return null
  }

  const year = Number(datePart.slice(0, 4))
  const month = Number(datePart.slice(4, 6))
  const day = Number(datePart.slice(6, 8))
  const hours = Number(timePart.slice(0, 2))
  const minutes = Number(timePart.slice(2, 4))
  const seconds = Number(timePart.slice(4, 6))

  if (
    [year, month, day, hours, minutes, seconds].some((value) => Number.isNaN(value))
  ) {
    return null
  }

  return new Date(year, month - 1, day, hours, minutes, seconds).toISOString()
}

const rotateAutoBackups = async (directory: string) => {
  const filenames = await getAutoBackupFilenames(directory)
  const obsoleteFilenames = filenames.slice(0, Math.max(0, filenames.length - AUTO_BACKUP_LIMIT))

  await Promise.all(obsoleteFilenames.map((filename) => unlink(toAutoBackupPath(directory, filename))))
}

export const getAutoBackupInfo = async (dataPath: string): Promise<AutoBackupInfo> => {
  const directory = await ensureAutoBackupDirectory(dataPath)
  const filenames = await getAutoBackupFilenames(directory)
  const latestFilename = filenames[filenames.length - 1]

  return {
    directory,
    backupCount: filenames.length,
    latestBackupAt: latestFilename ? parseBackupTimestamp(latestFilename) : null,
  }
}

export const readLatestAutoBackup = async (dataPath: string) => {
  const directory = await ensureAutoBackupDirectory(dataPath)
  const filenames = await getAutoBackupFilenames(directory)
  const latestFilename = filenames[filenames.length - 1]

  if (!latestFilename) {
    return {
      filePath: null,
      content: null,
    }
  }

  const filePath = toAutoBackupPath(directory, latestFilename)
  const content = await readFile(filePath, 'utf8')

  return {
    filePath,
    content,
  }
}

export const createAutoBackup = async (
  dataPath: string,
  options?: CreateAutoBackupOptions,
) => {
  const appData = getSqliteAppData(dataPath)

  if (!appData) {
    return {
      created: false,
      skipped: true,
      filePath: null,
      backupInfo: await getAutoBackupInfo(dataPath),
    }
  }

  const directory = await ensureAutoBackupDirectory(dataPath)
  const now = options?.clock?.now() ?? new Date()
  const todayDatePart = formatDatePart(now)

  if (options?.skipIfBackupExistsForToday) {
    const filenames = await getAutoBackupFilenames(directory)

    if (filenames.some((filename) => filename.includes(todayDatePart))) {
      return {
        created: false,
        skipped: true,
        filePath: null,
        backupInfo: await getAutoBackupInfo(dataPath),
      }
    }
  }

  const filename = `${AUTO_BACKUP_PREFIX}${formatTimestamp(now)}${AUTO_BACKUP_EXTENSION}`
  const filePath = toAutoBackupPath(directory, filename)
  const content = `${JSON.stringify(appData, null, 2)}\n`

  await writeFile(filePath, content, 'utf8')
  await rotateAutoBackups(directory)

  return {
    created: true,
    skipped: false,
    filePath,
    backupInfo: await getAutoBackupInfo(dataPath),
  }
}

export const maybeCreateStartupAutoBackup = async (dataPath: string) =>
  createAutoBackup(dataPath, {
    skipIfBackupExistsForToday: true,
  })

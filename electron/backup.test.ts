import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createAutoBackup, getAutoBackupInfo, maybeCreateStartupAutoBackup } from './backup'
import { replaceSqliteSnapshot } from './sqlite'
import { sqliteTestSeedAppData } from './test-fixtures'

const tempDirectories: string[] = []

const createTempDataPath = async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'j-flow-backup-test-'))
  tempDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0, tempDirectories.length).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  )
})

describe('electron/backup', () => {
  it('skips backup creation when app data is unavailable', async () => {
    const dataPath = await createTempDataPath()
    const result = await createAutoBackup(dataPath)

    expect(result.created).toBe(false)
    expect(result.skipped).toBe(true)
    expect(result.backupInfo.backupCount).toBe(0)
  })

  it('creates a JSON backup when app data exists', async () => {
    const dataPath = await createTempDataPath()
    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)

    const result = await createAutoBackup(dataPath)

    expect(result.created).toBe(true)
    expect(result.filePath).toBeTruthy()

    const content = await readFile(result.filePath as string, 'utf8')

    expect(JSON.parse(content)).toEqual(sqliteTestSeedAppData)
  })

  it('skips startup backup when a backup for today already exists', async () => {
    const dataPath = await createTempDataPath()
    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)

    const first = await maybeCreateStartupAutoBackup(dataPath)
    const second = await maybeCreateStartupAutoBackup(dataPath)

    expect(first.created || first.skipped).toBe(true)
    expect(second.created).toBe(false)
    expect(second.skipped).toBe(true)
  })

  it('rotates auto backups and keeps at most 20 files', async () => {
    const dataPath = await createTempDataPath()
    const backupsDirectory = path.join(dataPath, 'backups')
    const backupDates = Array.from({ length: 22 }, (_, index) => new Date(2026, 4, 1, 8, 0, index))

    for (const [index, backupDate] of backupDates.entries()) {
      replaceSqliteSnapshot(dataPath, {
        ...sqliteTestSeedAppData,
        settings: {
          ...sqliteTestSeedAppData.settings,
          updatedAt: backupDate.toISOString(),
        },
      })
      await createAutoBackup(dataPath, {
        clock: {
          now: () => backupDate,
        },
      })
    }

    const filenames = (await readdir(backupsDirectory)).filter((filename) =>
      filename.startsWith('j-flow-auto-backup-'),
    )
    const backupInfo = await getAutoBackupInfo(dataPath)

    expect(filenames).toHaveLength(20)
    expect(filenames[0]).toContain('20260501-080002')
    expect(filenames.at(-1)).toContain('20260501-080021')
    expect(backupInfo.backupCount).toBe(20)
  })
})

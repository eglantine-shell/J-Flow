import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  createSqliteDayPlanItem,
  deleteSqliteDayPlanItem,
  getSqliteDayPlanItemById,
  getSqliteLocalSyncState,
  listPendingSqliteSyncChanges,
  replaceSqliteSnapshot,
  setSqliteSyncTargetPath,
  updateSqliteDayPlanItem,
} from './sqlite'
import { exportLocalChangesToSyncFolder } from './sync-export'
import { importRemoteChangesFromSyncFolder } from './sync-import'
import { sqliteTestSeedAppData } from './test-fixtures'

const tempDirectories: string[] = []

const createTempDirectory = async (prefix: string) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix))
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

const createAndExportBaselineItem = async (dataPath: string, targetPath: string) => {
  replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)
  setSqliteSyncTargetPath(dataPath, targetPath)

  createSqliteDayPlanItem(dataPath, {
    id: 'day-plan-item-remote',
    date: '2026-05-03',
    originDate: '2026-05-03',
    timeBlock: 'day',
    timeBlockSource: 'default_day',
    sortOrder: 10,
    source: 'manual_temporary',
    title: '基线事项',
    isNecessary: false,
    requiresPreparation: false,
    preparationNotes: '',
    isSegmented: false,
    progressState: 'not_started',
    progressPercent: 0,
    status: 'pending',
    createdAt: '2026-05-03T08:00:00.000Z',
    updatedAt: '2026-05-03T08:00:00.000Z',
  })

  await exportLocalChangesToSyncFolder({
    dataPath,
    appVersion: '0.1.0',
  })
}

const itemFilePath = (targetPath: string) =>
  path.join(targetPath, 'items/dayPlanItems/day-plan-item-remote.json')

const tombstoneFilePath = (targetPath: string) =>
  path.join(targetPath, 'tombstones/dayPlanItems/day-plan-item-remote.json')

describe('electron/sync-import', () => {
  it('applies a newer remote item to local SQLite', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-import-db-')
    const targetPath = await createTempDirectory('j-flow-sync-import-folder-')

    await createAndExportBaselineItem(dataPath, targetPath)

    const remoteContent = JSON.parse(await readFile(itemFilePath(targetPath), 'utf8')) as Record<string, unknown>
    remoteContent.updatedAt = '2099-01-01T00:00:00.000Z'
    ;(remoteContent.data as Record<string, unknown>).updatedAt = '2099-01-01T00:00:00.000Z'
    ;(remoteContent.data as Record<string, unknown>).title = '远端更新事项'
    const originalRemoteFileContent = `${JSON.stringify(remoteContent, null, 2)}\n`
    await writeFile(itemFilePath(targetPath), originalRemoteFileContent, 'utf8')

    const result = await importRemoteChangesFromSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    expect(result.appliedCount).toBe(1)
    expect(getSqliteDayPlanItemById(dataPath, 'day-plan-item-remote')?.title).toBe('远端更新事项')
    expect(listPendingSqliteSyncChanges(dataPath)).toEqual([])
    expect(getSqliteLocalSyncState(dataPath).lastSyncedAt).toBeNull()
    expect(await readFile(itemFilePath(targetPath), 'utf8')).toBe(originalRemoteFileContent)
  })

  it('normalizes legacy remote stepped nextStep into plannedSteps during import', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-import-db-')
    const targetPath = await createTempDirectory('j-flow-sync-import-folder-')

    await createAndExportBaselineItem(dataPath, targetPath)

    const remoteContent = JSON.parse(await readFile(itemFilePath(targetPath), 'utf8')) as Record<string, unknown>
    remoteContent.updatedAt = '2099-01-01T00:00:00.000Z'
    const remoteData = remoteContent.data as Record<string, unknown>
    remoteData.updatedAt = '2099-01-01T00:00:00.000Z'
    remoteData.isStepped = true
    remoteData.isSegmented = false
    remoteData.currentStep = '第一步'
    remoteData.nextStep = '第二步'
    delete remoteData.plannedSteps
    await writeFile(itemFilePath(targetPath), `${JSON.stringify(remoteContent, null, 2)}\n`, 'utf8')

    const result = await importRemoteChangesFromSyncFolder({
      dataPath,
      appVersion: '3.2.0',
    })
    const importedItem = getSqliteDayPlanItemById(dataPath, 'day-plan-item-remote')

    expect(result.appliedCount).toBe(1)
    expect(importedItem?.isStepped).toBe(true)
    expect(importedItem?.nextStep).toBe('第二步')
    expect(importedItem?.plannedSteps).toEqual(['第二步'])
  })

  it('applies a remote item with equal updatedAt when its content differs', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-import-db-')
    const targetPath = await createTempDirectory('j-flow-sync-import-folder-')

    await createAndExportBaselineItem(dataPath, targetPath)

    const remoteContent = JSON.parse(await readFile(itemFilePath(targetPath), 'utf8')) as Record<string, unknown>
    const remoteData = remoteContent.data as Record<string, unknown>
    remoteData.title = '同时间戳远端内容'
    remoteContent.syncUpdatedAt = '2099-01-01T00:00:00.000Z'
    await writeFile(itemFilePath(targetPath), `${JSON.stringify(remoteContent, null, 2)}\n`, 'utf8')

    const result = await importRemoteChangesFromSyncFolder({
      dataPath,
      appVersion: '3.2.0',
    })

    expect(result.appliedCount).toBe(1)
    expect(getSqliteDayPlanItemById(dataPath, 'day-plan-item-remote')?.title).toBe(
      '同时间戳远端内容',
    )
  })

  it('skips an older remote item when local entity is newer', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-import-db-')
    const targetPath = await createTempDirectory('j-flow-sync-import-folder-')

    await createAndExportBaselineItem(dataPath, targetPath)
    updateSqliteDayPlanItem(dataPath, {
      id: 'day-plan-item-remote',
      title: '本地更新事项',
    })

    const pendingBefore = listPendingSqliteSyncChanges(dataPath)
    const result = await importRemoteChangesFromSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    expect(result.skippedCount).toBeGreaterThanOrEqual(1)
    expect(getSqliteDayPlanItemById(dataPath, 'day-plan-item-remote')?.title).toBe('本地更新事项')
    expect(listPendingSqliteSyncChanges(dataPath)).toEqual(pendingBefore)
  })

  it('applies a newer remote tombstone to local SQLite', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-import-db-')
    const targetPath = await createTempDirectory('j-flow-sync-import-folder-')

    await createAndExportBaselineItem(dataPath, targetPath)
    await writeFile(
      tombstoneFilePath(targetPath),
      `${JSON.stringify(
        {
          syncVersion: 1,
          entityType: 'dayPlanItem',
          id: 'day-plan-item-remote',
          deletedAt: '2099-01-01T00:00:00.000Z',
          deviceId: 'remote-device',
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const result = await importRemoteChangesFromSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    expect(result.appliedCount).toBeGreaterThanOrEqual(1)
    expect(getSqliteDayPlanItemById(dataPath, 'day-plan-item-remote')).toBeNull()
    expect(listPendingSqliteSyncChanges(dataPath)).toEqual([])
    expect(getSqliteLocalSyncState(dataPath).lastSyncedAt).toBeNull()
  })

  it('skips an older remote tombstone when local entity is newer', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-import-db-')
    const targetPath = await createTempDirectory('j-flow-sync-import-folder-')

    await createAndExportBaselineItem(dataPath, targetPath)
    updateSqliteDayPlanItem(dataPath, {
      id: 'day-plan-item-remote',
      title: '本地较新事项',
    })
    await writeFile(
      tombstoneFilePath(targetPath),
      `${JSON.stringify(
        {
          syncVersion: 1,
          entityType: 'dayPlanItem',
          id: 'day-plan-item-remote',
          deletedAt: '2026-05-03T08:30:00.000Z',
          deviceId: 'remote-device',
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const result = await importRemoteChangesFromSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    expect(result.skippedCount).toBeGreaterThanOrEqual(1)
    expect(getSqliteDayPlanItemById(dataPath, 'day-plan-item-remote')?.title).toBe('本地较新事项')
  })

  it('does not revive a locally deleted entity from an older remote item, but allows a newer one to revive it', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-import-db-')
    const targetPath = await createTempDirectory('j-flow-sync-import-folder-')

    await createAndExportBaselineItem(dataPath, targetPath)
    deleteSqliteDayPlanItem(dataPath, 'day-plan-item-remote')

    const oldRemoteItem = JSON.parse(await readFile(itemFilePath(targetPath), 'utf8')) as Record<string, unknown>
    ;(oldRemoteItem.data as Record<string, unknown>).title = '旧远端事项'
    await writeFile(itemFilePath(targetPath), `${JSON.stringify(oldRemoteItem, null, 2)}\n`, 'utf8')

    const firstImport = await importRemoteChangesFromSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    expect(firstImport.skippedCount).toBeGreaterThanOrEqual(1)
    expect(getSqliteDayPlanItemById(dataPath, 'day-plan-item-remote')).toBeNull()

    oldRemoteItem.updatedAt = '2099-01-01T00:00:00.000Z'
    ;(oldRemoteItem.data as Record<string, unknown>).updatedAt = '2099-01-01T00:00:00.000Z'
    ;(oldRemoteItem.data as Record<string, unknown>).title = '新远端事项'
    await writeFile(itemFilePath(targetPath), `${JSON.stringify(oldRemoteItem, null, 2)}\n`, 'utf8')

    const secondImport = await importRemoteChangesFromSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    expect(secondImport.appliedCount).toBeGreaterThanOrEqual(1)
    expect(getSqliteDayPlanItemById(dataPath, 'day-plan-item-remote')?.title).toBe('新远端事项')
    expect(listPendingSqliteSyncChanges(dataPath)).toEqual([])
  })

  it('records failures for malformed or invalid remote files without stopping the batch', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-import-db-')
    const targetPath = await createTempDirectory('j-flow-sync-import-folder-')

    await createAndExportBaselineItem(dataPath, targetPath)
    await writeFile(path.join(targetPath, 'items/dayPlanItems/bad-json.json'), '{bad json', 'utf8')
    await writeFile(
      path.join(targetPath, 'items/dayPlanItems/bad-entity-type.json'),
      `${JSON.stringify(
        {
          syncVersion: 1,
          entityType: 'sceneTag',
          id: 'bad-entity-type',
          updatedAt: '2099-01-01T00:00:00.000Z',
          deletedAt: null,
          deviceId: 'remote-device',
          data: {
            id: 'bad-entity-type',
            updatedAt: '2099-01-01T00:00:00.000Z',
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
    await writeFile(
      path.join(targetPath, 'tombstones/dayPlanItems/missing-deleted-at.json'),
      `${JSON.stringify(
        {
          syncVersion: 1,
          entityType: 'dayPlanItem',
          id: 'missing-deleted-at',
          deviceId: 'remote-device',
        },
        null,
        2,
      )}\n`,
      'utf8',
    )

    const result = await importRemoteChangesFromSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    expect(result.success).toBe(false)
    expect(result.failedCount).toBeGreaterThanOrEqual(3)
    expect(result.failures.some((failure) => failure.message.includes('entityType'))).toBe(true)
    expect(result.failures.some((failure) => failure.message.includes('缺少必要字段'))).toBe(true)
    expect(result.failures.some((failure) => failure.message.includes('JSON'))).toBe(true)
  })
})

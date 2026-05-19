import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  createSqliteDayPlanItem,
  deleteSqliteDayPlanItem,
  getSqliteLocalSyncState,
  listSqliteSyncChanges,
  replaceSqliteSnapshot,
  setSqliteSyncTargetPath,
  updateSqliteDayPlanItem,
} from './sqlite'
import { exportLocalChangesToSyncFolder, exportPendingSyncChanges } from './sync-export'
import { sqliteTestSeedAppData } from './test-fixtures'
import type { SyncChange } from './types'

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

const findSyncChange = (changes: SyncChange[], entityId: string) =>
  changes.find((change) => change.entityType === 'dayPlanItem' && change.entityId === entityId)

describe('electron/sync-export', () => {
  it('exports dayPlanItem upsert changes into items/dayPlanItems/<id>.json', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-export-db-')
    const targetPath = await createTempDirectory('j-flow-sync-export-folder-')

    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)
    setSqliteSyncTargetPath(dataPath, targetPath)
    await exportLocalChangesToSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    createSqliteDayPlanItem(dataPath, {
      id: 'day-plan-item-sync-export',
      date: '2026-05-03',
      originDate: '2026-05-03',
      timeBlock: 'day',
      timeBlockSource: 'default_day',
      sortOrder: 10,
      source: 'manual_temporary',
      title: '待导出事项',
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

    const updated = updateSqliteDayPlanItem(dataPath, {
      id: 'day-plan-item-sync-export',
      title: '待导出事项-已改',
    })

    const result = await exportLocalChangesToSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    const exportedItem = JSON.parse(
      await readFile(path.join(targetPath, 'items/dayPlanItems/day-plan-item-sync-export.json'), 'utf8'),
    ) as Record<string, unknown>
    const syncChange = findSyncChange(listSqliteSyncChanges(dataPath), 'day-plan-item-sync-export')

    expect(result.success).toBe(true)
    expect(exportedItem.updatedAt).toBe(updated?.updatedAt)
    expect(exportedItem.deletedAt).toBeNull()
    expect(syncChange?.syncedAt).toBeTruthy()
    expect(getSqliteLocalSyncState(dataPath).lastSyncedAt).toBeNull()
  })

  it('exports dayPlanItem delete changes into tombstones/dayPlanItems/<id>.json', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-export-db-')
    const targetPath = await createTempDirectory('j-flow-sync-export-folder-')

    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)
    setSqliteSyncTargetPath(dataPath, targetPath)
    await exportLocalChangesToSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    createSqliteDayPlanItem(dataPath, {
      id: 'day-plan-item-delete-export',
      date: '2026-05-03',
      originDate: '2026-05-03',
      timeBlock: 'day',
      timeBlockSource: 'default_day',
      sortOrder: 10,
      source: 'manual_temporary',
      title: '待删除事项',
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
    deleteSqliteDayPlanItem(dataPath, 'day-plan-item-delete-export')

    const beforeExportChange = findSyncChange(
      listSqliteSyncChanges(dataPath),
      'day-plan-item-delete-export',
    )
    const result = await exportLocalChangesToSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    const exportedTombstone = JSON.parse(
      await readFile(
        path.join(targetPath, 'tombstones/dayPlanItems/day-plan-item-delete-export.json'),
        'utf8',
      ),
    ) as Record<string, unknown>
    const syncChange = findSyncChange(listSqliteSyncChanges(dataPath), 'day-plan-item-delete-export')

    expect(result.success).toBe(true)
    expect(exportedTombstone.deletedAt).toBe(beforeExportChange?.changedAt)
    expect(syncChange?.syncedAt).toBeTruthy()
    expect(getSqliteLocalSyncState(dataPath).lastSyncedAt).toBeNull()
  })

  it('returns failures for missing upsert entities and keeps them unsynced', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-export-db-')
    const targetPath = await createTempDirectory('j-flow-sync-export-folder-')

    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)

    const result = await exportPendingSyncChanges({
      dataPath,
      targetPath,
      deviceId: 'device-sync-test',
      pendingChanges: [
        {
          id: 'dayPlanItem:missing-entity',
          entityType: 'dayPlanItem',
          entityId: 'missing-entity',
          changeType: 'upsert',
          changedAt: '2026-05-03T09:00:00.000Z',
          syncedAt: null,
          deviceId: 'device-sync-test',
        },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.failedCount).toBe(1)
    expect(result.failures[0]?.message).toContain('实体不存在')
    expect(getSqliteLocalSyncState(dataPath).lastSyncedAt).toBeNull()
  })

  it('keeps failed changes pending when export is partially successful', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-export-db-')
    const targetPath = await createTempDirectory('j-flow-sync-export-folder-')

    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)
    setSqliteSyncTargetPath(dataPath, targetPath)
    await exportLocalChangesToSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    const created = createSqliteDayPlanItem(dataPath, {
      id: 'day-plan-item-partial-success',
      date: '2026-05-03',
      originDate: '2026-05-03',
      timeBlock: 'day',
      timeBlockSource: 'default_day',
      sortOrder: 10,
      source: 'manual_temporary',
      title: '部分成功事项',
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

    const actualChange = findSyncChange(
      listSqliteSyncChanges(dataPath),
      'day-plan-item-partial-success',
    )

    const result = await exportPendingSyncChanges({
      dataPath,
      targetPath,
      deviceId: 'device-sync-test',
      pendingChanges: [
        actualChange!,
        {
          id: 'dayPlanItem:missing-entity',
          entityType: 'dayPlanItem',
          entityId: 'missing-entity',
          changeType: 'upsert',
          changedAt: '2026-05-03T09:00:00.000Z',
          syncedAt: null,
          deviceId: 'device-sync-test',
        },
      ],
    })

    const refreshedActualChange = findSyncChange(
      listSqliteSyncChanges(dataPath),
      'day-plan-item-partial-success',
    )

    expect(created.updatedAt).toBe('2026-05-03T08:00:00.000Z')
    expect(result.success).toBe(false)
    expect(result.exportedCount).toBe(1)
    expect(result.failedCount).toBe(1)
    expect(refreshedActualChange?.syncedAt).toBeTruthy()
    expect(result.failures[0]?.entityId).toBe('missing-entity')
  })
})

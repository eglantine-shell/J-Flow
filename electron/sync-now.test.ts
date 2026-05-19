import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { runManualSync } from './sync-now'
import {
  getSqliteLocalSyncState,
  listPendingSqliteSyncChanges,
  replaceSqliteSnapshot,
  setSqliteSyncTargetPath,
} from './sqlite'
import { exportLocalChangesToSyncFolder } from './sync-export'
import { sqliteTestSeedAppData } from './test-fixtures'

const tempDirectories: string[] = []

const createTempDirectory = async (prefix: string) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix))
  tempDirectories.push(directory)
  return directory
}

const createDependencies = () => {
  const getLocalSyncState = vi.fn(() => ({
    deviceId: 'device-sync-test',
    lastSyncedAt: null,
    lastSyncStatus: null,
    lastSyncError: null,
    lastSyncAttemptedAt: null,
    lastSyncResult: null,
    syncTargetPath: '/tmp/j-flow-sync',
  }))
  const prepareSyncTargetDirectory = vi.fn(async () => undefined)
  const acquireSyncLock = vi.fn(async () => ({
    acquired: true,
    reason: null,
    lockPath: '/tmp/j-flow-sync/locks/sync_device-sync-test.json',
  }))
  const releaseSyncLock = vi.fn(async () => undefined)
  const createAutoBackup = vi.fn(async () => ({
    created: true,
    skipped: false,
    filePath: '/tmp/backup.json',
    backupInfo: {
      directory: '/tmp/backups',
      backupCount: 1,
      latestBackupAt: '2026-05-18T09:59:00.000Z',
    },
  }))
  const importRemoteChangesFromSyncFolder = vi.fn(async () => ({
    success: true,
    targetPath: '/tmp/j-flow-sync',
    deviceId: 'device-sync-test',
    appliedCount: 1,
    skippedCount: 0,
    failedCount: 0,
    failures: [],
  }))
  const exportLocalChangesToSyncFolder = vi.fn(async () => ({
    success: true,
    targetPath: '/tmp/j-flow-sync',
    deviceId: 'device-sync-test',
    exportedCount: 2,
    failedCount: 0,
    failures: [],
  }))
  const setSqliteLastSyncedAt = vi.fn(() => ({
    deviceId: 'device-sync-test',
    lastSyncedAt: '2026-05-18T10:00:05.000Z',
    lastSyncStatus: null,
    lastSyncError: null,
    lastSyncAttemptedAt: null,
    lastSyncResult: null,
    syncTargetPath: '/tmp/j-flow-sync',
  }))
  const setSqliteLastSyncResult = vi.fn(() => ({
    deviceId: 'device-sync-test',
    lastSyncedAt: '2026-05-18T10:00:05.000Z',
    lastSyncStatus: 'success',
    lastSyncError: null,
    lastSyncAttemptedAt: '2026-05-18T10:00:05.000Z',
    lastSyncResult: null,
    syncTargetPath: '/tmp/j-flow-sync',
  }))
  const updateSyncDeviceInfo = vi.fn(async () => undefined)
  const now = vi
    .fn<() => string>()
    .mockReturnValueOnce('2026-05-18T10:00:00.000Z')
    .mockReturnValue('2026-05-18T10:00:05.000Z')

  return {
    getLocalSyncState,
    prepareSyncTargetDirectory,
    acquireSyncLock,
    releaseSyncLock,
    createAutoBackup,
    importRemoteChangesFromSyncFolder,
    exportLocalChangesToSyncFolder,
    setSqliteLastSyncedAt,
    setSqliteLastSyncResult,
    updateSyncDeviceInfo,
    now,
    getDeviceName: () => 'Test Mac',
    platform: 'darwin',
  }
}

describe('electron/sync-now', () => {
  it('runs the full sync closure and writes lastSyncedAt on complete success', async () => {
    const dependencies = createDependencies()

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('success')
    expect(result.success).toBe(true)
    expect(result.lastSyncedAtWritten).toBe(true)
    expect(dependencies.importRemoteChangesFromSyncFolder).toHaveBeenCalledTimes(1)
    expect(dependencies.exportLocalChangesToSyncFolder).toHaveBeenCalledTimes(1)
    expect(dependencies.setSqliteLastSyncedAt).toHaveBeenCalledWith(
      '/tmp/j-flow-db',
      '2026-05-18T10:00:05.000Z',
    )
    expect(dependencies.updateSyncDeviceInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        targetPath: '/tmp/j-flow-sync',
        deviceId: 'device-sync-test',
        lastSyncedAt: '2026-05-18T10:00:05.000Z',
      }),
    )
    expect(dependencies.releaseSyncLock).toHaveBeenCalledWith(
      '/tmp/j-flow-sync',
      'device-sync-test',
    )
  })

  it('writes lastSyncedAt even when there are no changes but the full closure succeeds', async () => {
    const dependencies = createDependencies()
    dependencies.importRemoteChangesFromSyncFolder.mockResolvedValue({
      success: true,
      targetPath: '/tmp/j-flow-sync',
      deviceId: 'device-sync-test',
      appliedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      failures: [],
    })
    dependencies.exportLocalChangesToSyncFolder.mockResolvedValue({
      success: true,
      targetPath: '/tmp/j-flow-sync',
      deviceId: 'device-sync-test',
      exportedCount: 0,
      failedCount: 0,
      failures: [],
    })

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('success')
    expect(dependencies.setSqliteLastSyncedAt).toHaveBeenCalledTimes(1)
  })

  it('returns partial and does not write lastSyncedAt when import has failures', async () => {
    const dependencies = createDependencies()
    dependencies.importRemoteChangesFromSyncFolder.mockResolvedValue({
      success: false,
      targetPath: '/tmp/j-flow-sync',
      deviceId: 'device-sync-test',
      appliedCount: 1,
      skippedCount: 0,
      failedCount: 1,
      failures: [
        {
          filePath: '/tmp/j-flow-sync/items/dayPlanItems/bad.json',
          message: '坏文件',
        },
      ],
    })

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('partial')
    expect(result.success).toBe(false)
    expect(result.lastSyncedAtWritten).toBe(false)
    expect(dependencies.setSqliteLastSyncedAt).not.toHaveBeenCalled()
  })

  it('returns partial and does not write lastSyncedAt when export has failures', async () => {
    const dependencies = createDependencies()
    dependencies.exportLocalChangesToSyncFolder.mockResolvedValue({
      success: false,
      targetPath: '/tmp/j-flow-sync',
      deviceId: 'device-sync-test',
      exportedCount: 1,
      failedCount: 1,
      failures: [
        {
          changeId: 'dayPlanItem:1',
          entityType: 'dayPlanItem',
          entityId: '1',
          changeType: 'upsert',
          message: '写入失败',
        },
      ],
    })

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('partial')
    expect(result.lastSyncedAtWritten).toBe(false)
    expect(dependencies.setSqliteLastSyncedAt).not.toHaveBeenCalled()
  })

  it('fails fast when syncTargetPath is missing', async () => {
    const dependencies = createDependencies()
    dependencies.getLocalSyncState.mockReturnValue({
      deviceId: 'device-sync-test',
      lastSyncedAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      lastSyncAttemptedAt: null,
      lastSyncResult: null,
      syncTargetPath: null,
    })

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('failed')
    expect(dependencies.prepareSyncTargetDirectory).not.toHaveBeenCalled()
    expect(dependencies.createAutoBackup).not.toHaveBeenCalled()
    expect(dependencies.importRemoteChangesFromSyncFolder).not.toHaveBeenCalled()
    expect(dependencies.exportLocalChangesToSyncFolder).not.toHaveBeenCalled()
  })

  it('fails and skips backup/import/export when lock acquisition conflicts', async () => {
    const dependencies = createDependencies()
    dependencies.acquireSyncLock.mockResolvedValue({
      acquired: false,
      reason: '另一台设备正在同步：remote-device',
      lockPath: null,
    })

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('failed')
    expect(result.errors[0]).toContain('另一台设备正在同步')
    expect(dependencies.createAutoBackup).not.toHaveBeenCalled()
    expect(dependencies.importRemoteChangesFromSyncFolder).not.toHaveBeenCalled()
    expect(dependencies.exportLocalChangesToSyncFolder).not.toHaveBeenCalled()
    expect(dependencies.releaseSyncLock).not.toHaveBeenCalled()
  })

  it('fails and releases its lock when auto backup cannot be created', async () => {
    const dependencies = createDependencies()
    dependencies.createAutoBackup.mockResolvedValue({
      created: false,
      skipped: true,
      filePath: null,
      backupInfo: {
        directory: '/tmp/backups',
        backupCount: 0,
        latestBackupAt: null,
      },
    })

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('failed')
    expect(dependencies.importRemoteChangesFromSyncFolder).not.toHaveBeenCalled()
    expect(dependencies.exportLocalChangesToSyncFolder).not.toHaveBeenCalled()
    expect(dependencies.releaseSyncLock).toHaveBeenCalledWith(
      '/tmp/j-flow-sync',
      'device-sync-test',
    )
  })

  it('releases its lock when an exception is thrown mid-sync', async () => {
    const dependencies = createDependencies()
    dependencies.importRemoteChangesFromSyncFolder.mockRejectedValue(new Error('import exploded'))

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('failed')
    expect(result.errors[0]).toContain('import exploded')
    expect(dependencies.releaseSyncLock).toHaveBeenCalledWith(
      '/tmp/j-flow-sync',
      'device-sync-test',
    )
  })

  it('does not create extra pending sync_changes during a successful no-op sync', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-now-db-')
    const targetPath = await createTempDirectory('j-flow-sync-now-folder-')

    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)
    setSqliteSyncTargetPath(dataPath, targetPath)
    await exportLocalChangesToSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    expect(listPendingSqliteSyncChanges(dataPath)).toEqual([])

    const result = await runManualSync({
      dataPath,
      appVersion: '0.1.0',
    })

    const deviceId = getSqliteLocalSyncState(dataPath).deviceId
    const deviceInfo = JSON.parse(
      await readFile(path.join(targetPath, `devices/${deviceId}.json`), 'utf8'),
    ) as Record<string, unknown>

    expect(result.status).toBe('success')
    expect(listPendingSqliteSyncChanges(dataPath)).toEqual([])
    expect(getSqliteLocalSyncState(dataPath).lastSyncedAt).toBe(result.completedAt)
    expect(deviceInfo.lastSyncedAt).toBe(result.completedAt)
  })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    tempDirectories.splice(0, tempDirectories.length).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  )
})

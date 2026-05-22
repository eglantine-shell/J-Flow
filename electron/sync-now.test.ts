import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { runManualSync } from './sync-now'
import {
  getSqliteLocalSyncState,
  listPendingSqliteSyncChanges,
  replaceSqliteSnapshot,
  setSqliteSyncTargetConfig,
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

const createMockDriver = (type: 'localFolder' = 'localFolder') => ({
  type,
  readText: vi.fn(),
  writeText: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  exists: vi.fn(),
  ensureDir: vi.fn(),
  safeWriteJson: vi.fn(),
})

const createDependencies = () => {
  const localDriver = createMockDriver('localFolder')

  const getLocalSyncState = vi.fn(() => ({
    deviceId: 'device-sync-test',
    lastSyncedAt: null,
    lastSyncStatus: null,
    lastSyncError: null,
    lastSyncAttemptedAt: null,
    lastSyncResult: null,
    syncTargetPath: '/tmp/j-flow-sync',
    syncTargetConfig: null,
  }))
  const prepareSyncTarget = vi.fn(async () => ({
    syncInfo: {
      syncVersion: 1,
      createdAt: '2026-05-18T09:59:00.000Z',
      updatedAt: '2026-05-18T09:59:00.000Z',
      appName: 'J-Flow' as const,
      minSupportedAppVersion: '0.1.0',
    },
    deviceInfo: {
      syncVersion: 1,
      deviceId: 'device-sync-test',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSeenAt: '2026-05-18T09:59:00.000Z',
      lastSyncedAt: null,
    },
    wasInitialized: false,
  }))
  const acquireSyncLock = vi.fn(async () => ({
    acquired: true as const,
    reason: null,
    lockLogicalPath: 'locks/sync_device-sync-test.json',
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
  const importRemoteChangesFromSyncTarget = vi.fn(async () => ({
    success: true,
    appliedCount: 1,
    skippedCount: 0,
    failedCount: 0,
    failures: [],
  }))
  const exportLocalChangesToSyncTarget = vi.fn(async () => ({
    success: true,
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
    syncTargetConfig: null,
  }))
  const setSqliteLastSyncResult = vi.fn(() => ({
    deviceId: 'device-sync-test',
    lastSyncedAt: '2026-05-18T10:00:05.000Z',
    lastSyncStatus: 'success',
    lastSyncError: null,
    lastSyncAttemptedAt: '2026-05-18T10:00:05.000Z',
    lastSyncResult: null,
    syncTargetPath: '/tmp/j-flow-sync',
    syncTargetConfig: null,
  }))
  const updateDeviceInfo = vi.fn(async () => undefined)
  const now = vi
    .fn<() => string>()
    .mockReturnValueOnce('2026-05-18T10:00:00.000Z')
    .mockReturnValue('2026-05-18T10:00:05.000Z')

  return {
    getLocalSyncState,
    prepareSyncTarget,
    acquireSyncLock,
    releaseSyncLock,
    createAutoBackup,
    importRemoteChangesFromSyncTarget,
    exportLocalChangesToSyncTarget,
    setSqliteLastSyncedAt,
    setSqliteLastSyncResult,
    updateDeviceInfo,
    now,
    getDeviceName: () => 'Test Mac',
    platform: 'darwin',
    resolveSyncTargetConfig: (syncState: ReturnType<typeof getLocalSyncState>) =>
      syncState.syncTargetConfig ??
      (syncState.syncTargetPath
        ? {
            type: 'localFolder' as const,
            path: syncState.syncTargetPath,
          }
        : null),
    createSyncTargetDriver: vi.fn(async ({ config }: { dataPath: string; config: { type: string } }) => {
      if (config.type === 'localFolder') {
        return localDriver
      }

      throw new Error(`当前还不支持同步目标类型：${config.type}`)
    }),
    describeSyncTarget: (config:
      | { type: 'localFolder'; path: string }
      | { type: 'oneDriveAppFolder'; accountId: string; displayName?: string }) => {
      if (config.type === 'localFolder') {
        return config.path
      }

      return config.type
    },
    localDriver,
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
    expect(dependencies.importRemoteChangesFromSyncTarget).toHaveBeenCalledTimes(1)
    expect(dependencies.exportLocalChangesToSyncTarget).toHaveBeenCalledTimes(1)
    expect(dependencies.setSqliteLastSyncedAt).toHaveBeenCalledWith(
      '/tmp/j-flow-db',
      '2026-05-18T10:00:05.000Z',
    )
    expect(dependencies.updateDeviceInfo).toHaveBeenCalledWith(
      dependencies.localDriver,
      expect.objectContaining({
        deviceId: 'device-sync-test',
        lastSyncedAt: '2026-05-18T10:00:05.000Z',
      }),
    )
    expect(dependencies.releaseSyncLock).toHaveBeenCalledWith(
      dependencies.localDriver,
      'device-sync-test',
    )
  })

  it('writes lastSyncedAt even when there are no changes but the full closure succeeds', async () => {
    const dependencies = createDependencies()
    dependencies.importRemoteChangesFromSyncTarget.mockResolvedValue({
      success: true,
      appliedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      failures: [],
    })
    dependencies.exportLocalChangesToSyncTarget.mockResolvedValue({
      success: true,
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
    dependencies.importRemoteChangesFromSyncTarget.mockResolvedValue({
      success: false,
      appliedCount: 1,
      skippedCount: 0,
      failedCount: 1,
      failures: [
        {
          filePath: 'items/dayPlanItems/bad.json',
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
    dependencies.exportLocalChangesToSyncTarget.mockResolvedValue({
      success: false,
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

  it('fails fast when no sync target is configured', async () => {
    const dependencies = createDependencies()
    dependencies.getLocalSyncState.mockReturnValue({
      deviceId: 'device-sync-test',
      lastSyncedAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      lastSyncAttemptedAt: null,
      lastSyncResult: null,
      syncTargetPath: null,
      syncTargetConfig: null,
    })

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('failed')
    expect(dependencies.prepareSyncTarget).not.toHaveBeenCalled()
    expect(dependencies.createAutoBackup).not.toHaveBeenCalled()
    expect(dependencies.importRemoteChangesFromSyncTarget).not.toHaveBeenCalled()
    expect(dependencies.exportLocalChangesToSyncTarget).not.toHaveBeenCalled()
  })

  it('fails with unsupported target config instead of crashing', async () => {
    const dependencies = createDependencies()
    dependencies.resolveSyncTargetConfig = () => ({
      type: 'oneDriveAppFolder',
      accountId: 'account-1',
      displayName: 'OneDrive',
    })

    const result = await runManualSync(
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
      },
      dependencies,
    )

    expect(result.status).toBe('failed')
    expect(result.errors[0]).toContain('当前还不支持同步目标类型')
    expect(dependencies.prepareSyncTarget).not.toHaveBeenCalled()
    expect(dependencies.createAutoBackup).not.toHaveBeenCalled()
    expect(dependencies.importRemoteChangesFromSyncTarget).not.toHaveBeenCalled()
    expect(dependencies.exportLocalChangesToSyncTarget).not.toHaveBeenCalled()
  })

  it('fails and skips backup/import/export when lock acquisition conflicts', async () => {
    const dependencies = createDependencies()
    dependencies.acquireSyncLock.mockResolvedValue({
      acquired: false,
      reason: '另一台设备正在同步：remote-device',
      lockLogicalPath: null,
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
    expect(dependencies.importRemoteChangesFromSyncTarget).not.toHaveBeenCalled()
    expect(dependencies.exportLocalChangesToSyncTarget).not.toHaveBeenCalled()
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
    expect(dependencies.importRemoteChangesFromSyncTarget).not.toHaveBeenCalled()
    expect(dependencies.exportLocalChangesToSyncTarget).not.toHaveBeenCalled()
    expect(dependencies.releaseSyncLock).toHaveBeenCalledWith(
      dependencies.localDriver,
      'device-sync-test',
    )
  })

  it('releases its lock when an exception is thrown mid-sync', async () => {
    const dependencies = createDependencies()
    dependencies.importRemoteChangesFromSyncTarget.mockRejectedValue(new Error('import exploded'))

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
      dependencies.localDriver,
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

  it('supports localFolder through syncTargetConfig as well as legacy syncTargetPath', async () => {
    const dataPath = await createTempDirectory('j-flow-sync-now-config-db-')
    const targetPath = await createTempDirectory('j-flow-sync-now-config-folder-')

    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)
    setSqliteSyncTargetConfig(dataPath, {
      type: 'localFolder',
      path: targetPath,
    })
    await exportLocalChangesToSyncFolder({
      dataPath,
      appVersion: '0.1.0',
    })

    const result = await runManualSync({
      dataPath,
      appVersion: '0.1.0',
    })

    expect(result.status).toBe('success')
    expect(result.targetPath).toBe(targetPath)
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

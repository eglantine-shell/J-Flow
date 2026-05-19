import os from 'node:os'

import { createAutoBackup } from './backup.js'
import { exportLocalChangesToSyncFolder } from './sync-export.js'
import { importRemoteChangesFromSyncFolder } from './sync-import.js'
import {
  getSqliteLocalSyncState,
  setSqliteLastSyncResult,
  setSqliteLastSyncedAt,
} from './sqlite.js'
import {
  acquireSyncLock,
  prepareSyncTargetDirectory,
  releaseSyncLock,
  updateSyncDeviceInfo,
} from './sync-folder.js'
import type {
  LocalSyncState,
  LocalSyncResultSummary,
  SyncExportResult,
  SyncImportResult,
  SyncNowResult,
} from './types.js'

const nowIso = () => new Date().toISOString()

type SyncNowDependencies = {
  getLocalSyncState: (dataPath: string) => LocalSyncState
  prepareSyncTargetDirectory: typeof prepareSyncTargetDirectory
  acquireSyncLock: typeof acquireSyncLock
  releaseSyncLock: typeof releaseSyncLock
  createAutoBackup: typeof createAutoBackup
  importRemoteChangesFromSyncFolder: typeof importRemoteChangesFromSyncFolder
  exportLocalChangesToSyncFolder: typeof exportLocalChangesToSyncFolder
  setSqliteLastSyncedAt: typeof setSqliteLastSyncedAt
  setSqliteLastSyncResult: typeof setSqliteLastSyncResult
  updateSyncDeviceInfo: typeof updateSyncDeviceInfo
  now: () => string
  getDeviceName: () => string
  platform: string
}

const defaultDependencies: SyncNowDependencies = {
  getLocalSyncState: getSqliteLocalSyncState,
  prepareSyncTargetDirectory,
  acquireSyncLock,
  releaseSyncLock,
  createAutoBackup,
  importRemoteChangesFromSyncFolder,
  exportLocalChangesToSyncFolder,
  setSqliteLastSyncedAt,
  setSqliteLastSyncResult,
  updateSyncDeviceInfo,
  now: nowIso,
  getDeviceName: () => os.hostname(),
  platform: process.platform,
}

const summarizeImportResult = (result: SyncImportResult) => ({
  appliedCount: result.appliedCount,
  skippedCount: result.skippedCount,
  failedCount: result.failedCount,
})

const summarizeExportResult = (result: SyncExportResult) => ({
  exportedCount: result.exportedCount,
  failedCount: result.failedCount,
})

const buildFailureResult = (input: {
  startedAt: string
  completedAt?: string
  targetPath: string | null
  deviceId: string
  backupCreated?: boolean
  backupFilePath?: string | null
  importResult?: SyncImportResult
  exportResult?: SyncExportResult
  errors: string[]
  warnings?: string[]
}): SyncNowResult => ({
  success: false,
  status: 'failed',
  startedAt: input.startedAt,
  completedAt: input.completedAt,
  targetPath: input.targetPath,
  deviceId: input.deviceId,
  backupCreated: input.backupCreated ?? false,
  backupFilePath: input.backupFilePath ?? null,
  importResult: input.importResult ? summarizeImportResult(input.importResult) : undefined,
  exportResult: input.exportResult ? summarizeExportResult(input.exportResult) : undefined,
  lastSyncedAtWritten: false,
  errors: input.errors,
  warnings: input.warnings ?? [],
})

const buildPartialResult = (input: {
  startedAt: string
  completedAt: string
  targetPath: string
  deviceId: string
  backupCreated: boolean
  backupFilePath: string | null
  importResult: SyncImportResult
  exportResult: SyncExportResult
  errors: string[]
  warnings?: string[]
}): SyncNowResult => ({
  success: false,
  status: 'partial',
  startedAt: input.startedAt,
  completedAt: input.completedAt,
  targetPath: input.targetPath,
  deviceId: input.deviceId,
  backupCreated: input.backupCreated,
  backupFilePath: input.backupFilePath,
  importResult: summarizeImportResult(input.importResult),
  exportResult: summarizeExportResult(input.exportResult),
  lastSyncedAtWritten: false,
  errors: input.errors,
  warnings: input.warnings ?? [],
})

const buildSuccessResult = (input: {
  startedAt: string
  completedAt: string
  targetPath: string
  deviceId: string
  backupCreated: boolean
  backupFilePath: string | null
  importResult: SyncImportResult
  exportResult: SyncExportResult
}): SyncNowResult => ({
  success: true,
  status: 'success',
  startedAt: input.startedAt,
  completedAt: input.completedAt,
  targetPath: input.targetPath,
  deviceId: input.deviceId,
  backupCreated: input.backupCreated,
  backupFilePath: input.backupFilePath,
  importResult: summarizeImportResult(input.importResult),
  exportResult: summarizeExportResult(input.exportResult),
  lastSyncedAtWritten: true,
  errors: [],
  warnings: [],
})

const collectPartialErrors = (importResult: SyncImportResult, exportResult: SyncExportResult) => [
  ...importResult.failures.map((failure) => failure.message),
  ...exportResult.failures.map((failure) => failure.message),
]

const toLocalSyncResultSummary = (result: SyncNowResult): LocalSyncResultSummary => ({
  status: result.status,
  attemptedAt: result.completedAt ?? result.startedAt,
  backupCreated: result.backupCreated,
  backupFilePath: result.backupFilePath ?? null,
  importResult: result.importResult,
  exportResult: result.exportResult,
  errors: result.errors,
  warnings: result.warnings,
})

export const runManualSync = async (
  input: {
    dataPath: string
    appVersion: string
  },
  dependencies: SyncNowDependencies = defaultDependencies,
): Promise<SyncNowResult> => {
  const startedAt = dependencies.now()
  const syncState = dependencies.getLocalSyncState(input.dataPath)
  const targetPath = syncState.syncTargetPath
  const deviceId = syncState.deviceId
  let lockAcquired = false
  let result: SyncNowResult = buildFailureResult({
    startedAt,
    targetPath,
    deviceId,
    errors: ['手动同步未完成。'],
  })

  if (!targetPath) {
    return buildFailureResult({
      startedAt,
      completedAt: dependencies.now(),
      targetPath: null,
      deviceId,
      errors: ['当前还没有设置同步文件夹路径。'],
    })
  }

  try {
    await dependencies.prepareSyncTargetDirectory({
      targetPath,
      deviceId,
      deviceName: dependencies.getDeviceName(),
      platform: dependencies.platform,
      appVersion: input.appVersion,
      lastSyncedAt: syncState.lastSyncedAt,
    })

    const lockResult = await dependencies.acquireSyncLock({
      targetPath,
      deviceId,
      appVersion: input.appVersion,
    })

    if (!lockResult.acquired) {
      result = buildFailureResult({
        startedAt,
        completedAt: dependencies.now(),
        targetPath,
        deviceId,
        errors: [lockResult.reason ?? '当前同步文件夹已被另一台设备占用。'],
      })
      dependencies.setSqliteLastSyncResult(input.dataPath, toLocalSyncResultSummary(result))
    } else {
      lockAcquired = true

      const backupResult = await dependencies.createAutoBackup(input.dataPath)

      if (!backupResult.created) {
        result = buildFailureResult({
          startedAt,
          completedAt: dependencies.now(),
          targetPath,
          deviceId,
          backupCreated: false,
          backupFilePath: backupResult.filePath,
          errors: ['同步前自动备份失败，已中止本轮同步。'],
        })
        dependencies.setSqliteLastSyncResult(input.dataPath, toLocalSyncResultSummary(result))
      } else {
        const importResult = await dependencies.importRemoteChangesFromSyncFolder({
          dataPath: input.dataPath,
          appVersion: input.appVersion,
        })
        const exportResult = await dependencies.exportLocalChangesToSyncFolder({
          dataPath: input.dataPath,
          appVersion: input.appVersion,
        })
        const completedAt = dependencies.now()

        if (importResult.failedCount > 0 || exportResult.failedCount > 0) {
          result = buildPartialResult({
            startedAt,
            completedAt,
            targetPath,
            deviceId,
            backupCreated: true,
            backupFilePath: backupResult.filePath,
            importResult,
            exportResult,
            errors: collectPartialErrors(importResult, exportResult),
          })
          dependencies.setSqliteLastSyncResult(input.dataPath, toLocalSyncResultSummary(result))
        } else {
          await dependencies.updateSyncDeviceInfo({
            targetPath,
            deviceId,
            deviceName: dependencies.getDeviceName(),
            platform: dependencies.platform,
            appVersion: input.appVersion,
            lastSyncedAt: completedAt,
          })
          dependencies.setSqliteLastSyncedAt(input.dataPath, completedAt)

          result = buildSuccessResult({
            startedAt,
            completedAt,
            targetPath,
            deviceId,
            backupCreated: true,
            backupFilePath: backupResult.filePath,
            importResult,
            exportResult,
          })
          dependencies.setSqliteLastSyncResult(input.dataPath, toLocalSyncResultSummary(result))
        }
      }
    }
  } catch (error: unknown) {
    result = buildFailureResult({
      startedAt,
      completedAt: dependencies.now(),
      targetPath,
      deviceId,
      errors: [error instanceof Error ? error.message : '手动同步失败。'],
    })

    if (targetPath) {
      dependencies.setSqliteLastSyncResult(input.dataPath, toLocalSyncResultSummary(result))
    }
  } finally {
    if (lockAcquired) {
      try {
        await dependencies.releaseSyncLock(targetPath, deviceId)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '同步锁释放失败。'
        const warnings = [...result.warnings, `同步锁释放失败：${message}`]
        result = {
          ...result,
          warnings,
        }
      }
    }
  }

  return result
}

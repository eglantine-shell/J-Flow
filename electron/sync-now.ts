import os from 'node:os'

import { createAutoBackup } from './backup.js'
import { exportLocalChangesToSyncTarget } from './sync-export.js'
import { importRemoteChangesFromSyncTarget } from './sync-import.js'
import {
  getSqliteLocalSyncState,
  setSqliteLastSyncResult,
  setSqliteLastSyncedAt,
} from './sqlite.js'
import {
  acquireSyncLock,
  prepareSyncTarget,
  releaseSyncLock,
  updateDeviceInfo,
} from './sync-target/metadata.js'
import type { SyncTargetConfig, SyncTargetDriver } from './sync-target/index.js'
import { LocalFolderDriver } from './sync-target/index.js'
import type { LocalSyncState, LocalSyncResultSummary, SyncNowResult } from './types.js'

const nowIso = () => new Date().toISOString()

type ImportSummaryResult = Awaited<ReturnType<typeof importRemoteChangesFromSyncTarget>>
type ExportSummaryResult = Awaited<ReturnType<typeof exportLocalChangesToSyncTarget>>

type SyncNowDependencies = {
  getLocalSyncState: (dataPath: string) => LocalSyncState
  prepareSyncTarget: typeof prepareSyncTarget
  acquireSyncLock: typeof acquireSyncLock
  releaseSyncLock: typeof releaseSyncLock
  createAutoBackup: typeof createAutoBackup
  importRemoteChangesFromSyncTarget: typeof importRemoteChangesFromSyncTarget
  exportLocalChangesToSyncTarget: typeof exportLocalChangesToSyncTarget
  setSqliteLastSyncedAt: typeof setSqliteLastSyncedAt
  setSqliteLastSyncResult: typeof setSqliteLastSyncResult
  updateDeviceInfo: typeof updateDeviceInfo
  now: () => string
  getDeviceName: () => string
  platform: string
  resolveSyncTargetConfig: (syncState: LocalSyncState) => SyncTargetConfig | null
  createSyncTargetDriver: (input: {
    dataPath: string
    config: SyncTargetConfig
  }) => Promise<SyncTargetDriver>
  describeSyncTarget: (config: SyncTargetConfig) => string
}

const defaultDependencies: SyncNowDependencies = {
  getLocalSyncState: getSqliteLocalSyncState,
  prepareSyncTarget,
  acquireSyncLock,
  releaseSyncLock,
  createAutoBackup,
  importRemoteChangesFromSyncTarget,
  exportLocalChangesToSyncTarget,
  setSqliteLastSyncedAt,
  setSqliteLastSyncResult,
  updateDeviceInfo,
  now: nowIso,
  getDeviceName: () => os.hostname(),
  platform: process.platform,
  resolveSyncTargetConfig: (syncState) =>
    syncState.syncTargetConfig ??
    (syncState.syncTargetPath
      ? {
          type: 'localFolder',
          path: syncState.syncTargetPath,
        }
      : null),
  createSyncTargetDriver: async ({ dataPath, config }) => {
    if (config.type === 'localFolder') {
      return new LocalFolderDriver(config.path)
    }

    throw new Error(`当前还不支持同步目标类型：${config.type}`)
  },
  describeSyncTarget: (config) => {
    if (config.type === 'localFolder') {
      return config.path
    }

    return config.type
  },
}

const summarizeImportResult = (result: ImportSummaryResult) => ({
  appliedCount: result.appliedCount,
  skippedCount: result.skippedCount,
  failedCount: result.failedCount,
})

const summarizeExportResult = (result: ExportSummaryResult) => ({
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
  importResult?: ImportSummaryResult
  exportResult?: ExportSummaryResult
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
  importResult: ImportSummaryResult
  exportResult: ExportSummaryResult
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
  importResult: ImportSummaryResult
  exportResult: ExportSummaryResult
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

const collectPartialErrors = (importResult: ImportSummaryResult, exportResult: ExportSummaryResult) => [
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
  const deviceId = syncState.deviceId
  const targetConfig = dependencies.resolveSyncTargetConfig(syncState)
  const targetPath = targetConfig ? dependencies.describeSyncTarget(targetConfig) : null
  let driver: SyncTargetDriver | null = null
  let lockAcquired = false
  let result: SyncNowResult = buildFailureResult({
    startedAt,
    targetPath,
    deviceId,
    errors: ['手动同步未完成。'],
  })

  if (!targetConfig) {
    return buildFailureResult({
      startedAt,
      completedAt: dependencies.now(),
      targetPath: null,
      deviceId,
      errors: ['当前还没有设置同步目标。'],
    })
  }

  try {
    driver = await dependencies.createSyncTargetDriver({
      dataPath: input.dataPath,
      config: targetConfig,
    })

    await dependencies.prepareSyncTarget(driver, {
      deviceId,
      deviceName: dependencies.getDeviceName(),
      platform: dependencies.platform,
      appVersion: input.appVersion,
      lastSyncedAt: syncState.lastSyncedAt,
    })

    const lockResult = await dependencies.acquireSyncLock(driver, {
      deviceId,
      appVersion: input.appVersion,
    })

    if (!lockResult.acquired) {
      result = buildFailureResult({
        startedAt,
        completedAt: dependencies.now(),
        targetPath,
        deviceId,
        errors: [lockResult.reason ?? '当前同步目标已被另一台设备占用。'],
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
        const importResult = await dependencies.importRemoteChangesFromSyncTarget({
          dataPath: input.dataPath,
          appVersion: input.appVersion,
          deviceId,
          deviceName: dependencies.getDeviceName(),
          platform: dependencies.platform,
          lastSyncedAt: syncState.lastSyncedAt,
          driver,
        })
        const exportResult = await dependencies.exportLocalChangesToSyncTarget({
          dataPath: input.dataPath,
          appVersion: input.appVersion,
          deviceId,
          deviceName: dependencies.getDeviceName(),
          platform: dependencies.platform,
          lastSyncedAt: syncState.lastSyncedAt,
          driver,
        })
        const completedAt = dependencies.now()

        if (importResult.failedCount > 0 || exportResult.failedCount > 0) {
          result = buildPartialResult({
            startedAt,
            completedAt,
            targetPath: targetPath ?? '',
            deviceId,
            backupCreated: true,
            backupFilePath: backupResult.filePath,
            importResult,
            exportResult,
            errors: collectPartialErrors(importResult, exportResult),
          })
          dependencies.setSqliteLastSyncResult(input.dataPath, toLocalSyncResultSummary(result))
        } else {
          await dependencies.updateDeviceInfo(driver, {
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
            targetPath: targetPath ?? '',
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

    if (targetConfig) {
      dependencies.setSqliteLastSyncResult(input.dataPath, toLocalSyncResultSummary(result))
    }
  } finally {
    if (lockAcquired && driver) {
      try {
        await dependencies.releaseSyncLock(driver, deviceId)
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

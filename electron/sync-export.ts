import os from 'node:os'
import path from 'node:path'

import {
  getSqliteActivityTypeById,
  getSqliteDayPlanItemById,
  getSqliteLocalSyncState,
  getSqliteRecurringTaskInstanceById,
  getSqliteSceneTagById,
  getSqliteSettings,
  getSqliteTaskTemplateById,
  listPendingSqliteSyncChanges,
  markSqliteSyncChangeSyncedAt,
} from './sqlite.js'
import {
  getSyncItemDirectoryPath,
  getSyncTombstoneDirectoryPath,
  prepareSyncTargetDirectory,
  safeWriteJsonAtomic,
} from './sync-folder.js'
import type {
  ActivityType,
  AppSettings,
  DayPlanItem,
  RecurringTaskInstance,
  SceneTag,
  SyncChange,
  SyncEntityType,
  SyncExportFailure,
  SyncExportResult,
  SyncItemFile,
  SyncTombstoneFile,
  TaskTemplate,
} from './types.js'

const SYNC_VERSION = 1
const SETTINGS_SYNC_ENTITY_ID = 'app-settings'

const nowIso = () => new Date().toISOString()

const ENTITY_DIRECTORY_MAP: Record<
  SyncEntityType,
  'settings' | 'sceneTags' | 'activityTypes' | 'taskTemplates' | 'recurringTaskInstances' | 'dayPlanItems'
> = {
  settings: 'settings',
  sceneTag: 'sceneTags',
  activityType: 'activityTypes',
  taskTemplate: 'taskTemplates',
  recurringTaskInstance: 'recurringTaskInstances',
  dayPlanItem: 'dayPlanItems',
}

const readEntityForSyncExport = (
  dataPath: string,
  change: SyncChange,
):
  | AppSettings
  | SceneTag
  | ActivityType
  | TaskTemplate
  | RecurringTaskInstance
  | DayPlanItem
  | null => {
  switch (change.entityType) {
    case 'settings':
      return getSqliteSettings(dataPath)
    case 'sceneTag':
      return getSqliteSceneTagById(dataPath, change.entityId)
    case 'activityType':
      return getSqliteActivityTypeById(dataPath, change.entityId)
    case 'taskTemplate':
      return getSqliteTaskTemplateById(dataPath, change.entityId)
    case 'recurringTaskInstance':
      return getSqliteRecurringTaskInstanceById(dataPath, change.entityId)
    case 'dayPlanItem':
      return getSqliteDayPlanItemById(dataPath, change.entityId)
    default:
      return null
  }
}

const resolveEntityUpdatedAt = (
  entity:
    | AppSettings
    | SceneTag
    | ActivityType
    | TaskTemplate
    | RecurringTaskInstance
    | DayPlanItem,
) => entity.updatedAt

const buildItemFilePayload = (
  change: SyncChange,
  deviceId: string,
  entity:
    | AppSettings
    | SceneTag
    | ActivityType
    | TaskTemplate
    | RecurringTaskInstance
    | DayPlanItem,
): SyncItemFile => ({
  syncVersion: SYNC_VERSION,
  entityType: change.entityType,
  id: change.entityId,
  updatedAt: resolveEntityUpdatedAt(entity),
  deletedAt: null,
  deviceId,
  data: entity,
})

const buildTombstoneFilePayload = (change: SyncChange, deviceId: string): SyncTombstoneFile => ({
  syncVersion: SYNC_VERSION,
  entityType: change.entityType,
  id: change.entityId,
  deletedAt: change.changedAt,
  deviceId,
})

const buildFailure = (change: SyncChange, message: string): SyncExportFailure => ({
  changeId: change.id,
  entityType: change.entityType,
  entityId: change.entityId,
  changeType: change.changeType,
  message,
})

export const exportPendingSyncChanges = async (input: {
  dataPath: string
  targetPath: string
  deviceId: string
  pendingChanges: SyncChange[]
}): Promise<Pick<SyncExportResult, 'success' | 'exportedCount' | 'failedCount' | 'failures'>> => {
  const failures: SyncExportFailure[] = []
  let exportedCount = 0

  for (const change of input.pendingChanges) {
    try {
      if (change.changeType === 'upsert') {
        const entity = readEntityForSyncExport(input.dataPath, change)

        if (!entity) {
          failures.push(buildFailure(change, '本地 upsert 记录对应的实体不存在。'))
          continue
        }

        const payload = buildItemFilePayload(change, input.deviceId, entity)
        const filePath = path.join(
          getSyncItemDirectoryPath(input.targetPath, ENTITY_DIRECTORY_MAP[change.entityType]),
          `${change.entityId}.json`,
        )

        await safeWriteJsonAtomic(filePath, payload)
      } else {
        const payload = buildTombstoneFilePayload(change, input.deviceId)
        const filePath = path.join(
          getSyncTombstoneDirectoryPath(input.targetPath, ENTITY_DIRECTORY_MAP[change.entityType]),
          `${change.entityId}.json`,
        )

        await safeWriteJsonAtomic(filePath, payload)
      }

      const syncedAt = nowIso()
      const marked = markSqliteSyncChangeSyncedAt(input.dataPath, change.id, syncedAt)

      if (!marked) {
        failures.push(buildFailure(change, '导出文件成功，但更新 syncedAt 失败。'))
        continue
      }

      exportedCount += 1
    } catch (error: unknown) {
      failures.push(
        buildFailure(change, error instanceof Error ? error.message : '导出本地变化失败。'),
      )
    }
  }

  return {
    success: failures.length === 0,
    exportedCount,
    failedCount: failures.length,
    failures,
  }
}

export const exportLocalChangesToSyncFolder = async (input: {
  dataPath: string
  appVersion: string
}): Promise<SyncExportResult> => {
  const syncState = getSqliteLocalSyncState(input.dataPath)

  if (!syncState.syncTargetPath) {
    return {
      success: false,
      targetPath: '',
      deviceId: syncState.deviceId,
      exportedCount: 0,
      failedCount: 1,
      failures: [
        {
          changeId: 'sync-target-path',
          entityType: 'settings',
          entityId: SETTINGS_SYNC_ENTITY_ID,
          changeType: 'upsert',
          message: '当前还没有设置同步文件夹路径。',
        },
      ],
    }
  }

  await prepareSyncTargetDirectory({
    targetPath: syncState.syncTargetPath,
    deviceId: syncState.deviceId,
    deviceName: os.hostname(),
    platform: process.platform,
    appVersion: input.appVersion,
    lastSyncedAt: syncState.lastSyncedAt,
  })

  const pendingChanges = listPendingSqliteSyncChanges(input.dataPath)
  const exportResult = await exportPendingSyncChanges({
    dataPath: input.dataPath,
    targetPath: syncState.syncTargetPath,
    deviceId: syncState.deviceId,
    pendingChanges,
  })

  if (exportResult.exportedCount > 0) {
    await prepareSyncTargetDirectory({
      targetPath: syncState.syncTargetPath,
      deviceId: syncState.deviceId,
      deviceName: os.hostname(),
      platform: process.platform,
      appVersion: input.appVersion,
      lastSyncedAt: syncState.lastSyncedAt,
    })
  }

  return {
    success: exportResult.success,
    targetPath: syncState.syncTargetPath,
    deviceId: syncState.deviceId,
    exportedCount: exportResult.exportedCount,
    failedCount: exportResult.failedCount,
    failures: exportResult.failures,
  }
}

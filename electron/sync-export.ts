import os from 'node:os'

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
import { prepareSyncTarget } from './sync-target/metadata.js'
import type { SyncTargetDriver } from './sync-target/index.js'
import { LocalFolderDriver } from './sync-target/index.js'
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

const buildItemLogicalPath = (entityType: SyncEntityType, entityId: string) =>
  `items/${ENTITY_DIRECTORY_MAP[entityType]}/${entityId}.json`

const buildTombstoneLogicalPath = (entityType: SyncEntityType, entityId: string) =>
  `tombstones/${ENTITY_DIRECTORY_MAP[entityType]}/${entityId}.json`

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

const resolveSyncUpdatedAt = (
  change: SyncChange,
  entity:
    | AppSettings
    | SceneTag
    | ActivityType
    | TaskTemplate
    | RecurringTaskInstance
    | DayPlanItem,
) => {
  const entityUpdatedAt = resolveEntityUpdatedAt(entity)

  return change.changedAt > entityUpdatedAt ? change.changedAt : entityUpdatedAt
}

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
  syncUpdatedAt: resolveSyncUpdatedAt(change, entity),
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
  const driver = new LocalFolderDriver(input.targetPath)

  return exportPendingSyncChangesToTarget({
    dataPath: input.dataPath,
    deviceId: input.deviceId,
    driver,
    pendingChanges: input.pendingChanges,
  })
}

export const exportPendingSyncChangesToTarget = async (input: {
  dataPath: string
  deviceId: string
  driver: SyncTargetDriver
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
        await input.driver.safeWriteJson(buildItemLogicalPath(change.entityType, change.entityId), payload)
      } else {
        const payload = buildTombstoneFilePayload(change, input.deviceId)
        await input.driver.safeWriteJson(
          buildTombstoneLogicalPath(change.entityType, change.entityId),
          payload,
        )
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

export const exportLocalChangesToSyncTarget = async (input: {
  dataPath: string
  appVersion: string
  deviceId: string
  deviceName: string
  platform: string
  lastSyncedAt: string | null
  driver: SyncTargetDriver
}) => {
  await prepareSyncTarget(input.driver, {
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    platform: input.platform,
    appVersion: input.appVersion,
    lastSyncedAt: input.lastSyncedAt,
  })

  const pendingChanges = listPendingSqliteSyncChanges(input.dataPath)
  const exportResult = await exportPendingSyncChangesToTarget({
    dataPath: input.dataPath,
    deviceId: input.deviceId,
    driver: input.driver,
    pendingChanges,
  })

  if (exportResult.exportedCount > 0) {
    await prepareSyncTarget(input.driver, {
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      platform: input.platform,
      appVersion: input.appVersion,
      lastSyncedAt: input.lastSyncedAt,
    })
  }

  return exportResult
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

  const exportResult = await exportLocalChangesToSyncTarget({
    dataPath: input.dataPath,
    appVersion: input.appVersion,
    deviceId: syncState.deviceId,
    deviceName: os.hostname(),
    platform: process.platform,
    lastSyncedAt: syncState.lastSyncedAt,
    driver: new LocalFolderDriver(syncState.syncTargetPath),
  })

  return {
    success: exportResult.success,
    targetPath: syncState.syncTargetPath,
    deviceId: syncState.deviceId,
    exportedCount: exportResult.exportedCount,
    failedCount: exportResult.failedCount,
    failures: exportResult.failures,
  }
}

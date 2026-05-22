import os from 'node:os'

import {
  applyRemoteSqliteActivityType,
  applyRemoteSqliteDayPlanItem,
  applyRemoteSqliteDelete,
  applyRemoteSqliteRecurringTaskInstance,
  applyRemoteSqliteSceneTag,
  applyRemoteSqliteSettings,
  applyRemoteSqliteTaskTemplate,
  getSqliteActivityTypeById,
  getSqliteDayPlanItemById,
  getSqliteLocalSyncState,
  getSqliteRecurringTaskInstanceById,
  getSqliteSceneTagById,
  getSqliteSettings,
  getSqliteSyncChangeByEntity,
  getSqliteTaskTemplateById,
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
  SyncEntityType,
  SyncImportFailure,
  SyncImportResult,
  SyncItemFile,
  SyncTombstoneFile,
  TaskTemplate,
} from './types.js'

const SYNC_VERSION = 1
const SETTINGS_SYNC_ENTITY_ID = 'app-settings'

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

const buildItemLogicalPrefix = (entityType: SyncEntityType) => `items/${ENTITY_DIRECTORY_MAP[entityType]}`
const buildTombstoneLogicalPrefix = (entityType: Exclude<SyncEntityType, 'settings'>) =>
  `tombstones/${ENTITY_DIRECTORY_MAP[entityType]}`

type SupportedSyncEntity =
  | AppSettings
  | SceneTag
  | ActivityType
  | TaskTemplate
  | RecurringTaskInstance
  | DayPlanItem

type RemoteRecord =
  | {
      kind: 'item'
      filePath: string
      entityType: SyncEntityType
      entityId: string
      timestamp: string
      payload: SyncItemFile
    }
  | {
      kind: 'tombstone'
      filePath: string
      entityType: Exclude<SyncEntityType, 'settings'>
      entityId: string
      timestamp: string
      payload: SyncTombstoneFile
    }

const buildFailure = (filePath: string, message: string, entityType?: SyncEntityType, entityId?: string): SyncImportFailure => ({
  filePath,
  entityType,
  entityId,
  message,
})

const readLocalEntity = (dataPath: string, entityType: SyncEntityType, entityId: string) => {
  switch (entityType) {
    case 'settings':
      return getSqliteSettings(dataPath)
    case 'sceneTag':
      return getSqliteSceneTagById(dataPath, entityId)
    case 'activityType':
      return getSqliteActivityTypeById(dataPath, entityId)
    case 'taskTemplate':
      return getSqliteTaskTemplateById(dataPath, entityId)
    case 'recurringTaskInstance':
      return getSqliteRecurringTaskInstanceById(dataPath, entityId)
    case 'dayPlanItem':
      return getSqliteDayPlanItemById(dataPath, entityId)
  }
}

const applyRemoteUpsert = (
  dataPath: string,
  entityType: SyncEntityType,
  entity: SupportedSyncEntity,
) => {
  switch (entityType) {
    case 'settings':
      return applyRemoteSqliteSettings(dataPath, entity as AppSettings)
    case 'sceneTag':
      return applyRemoteSqliteSceneTag(dataPath, entity as SceneTag)
    case 'activityType':
      return applyRemoteSqliteActivityType(dataPath, entity as ActivityType)
    case 'taskTemplate':
      return applyRemoteSqliteTaskTemplate(dataPath, entity as TaskTemplate)
    case 'recurringTaskInstance':
      return applyRemoteSqliteRecurringTaskInstance(dataPath, entity as RecurringTaskInstance)
    case 'dayPlanItem':
      return applyRemoteSqliteDayPlanItem(dataPath, entity as DayPlanItem)
  }
}

const validateSyncItemFile = (
  value: unknown,
  expectedEntityType: SyncEntityType,
  filePath: string,
): SyncItemFile => {
  if (!value || typeof value !== 'object') {
    throw new Error('sync item 不是合法的 JSON 对象。')
  }

  const candidate = value as Record<string, unknown>

  if (candidate.syncVersion !== SYNC_VERSION) {
    throw new Error('sync item 的 syncVersion 不受当前版本支持。')
  }

  if (candidate.entityType !== expectedEntityType) {
    throw new Error('sync item 的 entityType 与目录不匹配。')
  }

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    typeof candidate.deviceId !== 'string' ||
    candidate.deletedAt !== null ||
    !candidate.data ||
    typeof candidate.data !== 'object'
  ) {
    throw new Error(`sync item 文件缺少必要字段：${filePath}`)
  }

  const data = candidate.data as Record<string, unknown>

  if (expectedEntityType !== 'settings') {
    if (typeof data.id !== 'string' || data.id !== candidate.id) {
      throw new Error('sync item 的 data.id 与文件 id 不一致。')
    }
  }

  return candidate as unknown as SyncItemFile
}

const validateSyncTombstoneFile = (
  value: unknown,
  expectedEntityType: Exclude<SyncEntityType, 'settings'>,
  filePath: string,
): SyncTombstoneFile => {
  if (!value || typeof value !== 'object') {
    throw new Error('tombstone 不是合法的 JSON 对象。')
  }

  const candidate = value as Record<string, unknown>

  if (candidate.syncVersion !== SYNC_VERSION) {
    throw new Error('tombstone 的 syncVersion 不受当前版本支持。')
  }

  if (candidate.entityType !== expectedEntityType) {
    throw new Error('tombstone 的 entityType 与目录不匹配。')
  }

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.deletedAt !== 'string' ||
    typeof candidate.deviceId !== 'string'
  ) {
    throw new Error(`tombstone 文件缺少必要字段：${filePath}`)
  }

  return candidate as unknown as SyncTombstoneFile
}

export const scanRemoteRecordsFromTarget = async (
  driver: SyncTargetDriver,
): Promise<{
  records: RemoteRecord[]
  failures: SyncImportFailure[]
}> => {
  const records: RemoteRecord[] = []
  const failures: SyncImportFailure[] = []

  for (const [entityType, directoryName] of Object.entries(ENTITY_DIRECTORY_MAP) as Array<
    [SyncEntityType, (typeof ENTITY_DIRECTORY_MAP)[SyncEntityType]]
  >) {
    const itemDirectoryLogicalPath = buildItemLogicalPrefix(entityType)
    const tombstoneDirectoryLogicalPath =
      entityType === 'settings'
        ? null
        : buildTombstoneLogicalPrefix(entityType as Exclude<SyncEntityType, 'settings'>)
    const itemEntries = await driver.list(itemDirectoryLogicalPath).catch(() => [])
    const tombstoneEntries =
      entityType === 'settings' || !tombstoneDirectoryLogicalPath
        ? []
        : await driver.list(tombstoneDirectoryLogicalPath).catch(() => [])

    for (const itemEntry of itemEntries.filter(
      (entry) => entry.kind === 'file' && entry.logicalPath.endsWith('.json'),
    )) {
      const filePath = itemEntry.logicalPath

      try {
        const parsed = validateSyncItemFile(
          JSON.parse(await driver.readText(itemEntry.logicalPath)) as unknown,
          entityType,
          filePath,
        )

        records.push({
          kind: 'item',
          filePath,
          entityType,
          entityId: parsed.id,
          timestamp: parsed.updatedAt,
          payload: parsed,
        })
      } catch (error: unknown) {
        failures.push(
          buildFailure(
            filePath,
            error instanceof Error
              ? `读取远端 sync item JSON 失败：${error.message}`
              : '读取远端 sync item JSON 失败。',
            entityType,
          ),
        )
      }
    }

    for (const tombstoneEntry of tombstoneEntries.filter(
      (entry) => entry.kind === 'file' && entry.logicalPath.endsWith('.json'),
    )) {
      const filePath = tombstoneEntry.logicalPath

      try {
        const parsed = validateSyncTombstoneFile(
          JSON.parse(await driver.readText(tombstoneEntry.logicalPath)) as unknown,
          entityType as Exclude<SyncEntityType, 'settings'>,
          filePath,
        )

        records.push({
          kind: 'tombstone',
          filePath,
          entityType: entityType as Exclude<SyncEntityType, 'settings'>,
          entityId: parsed.id,
          timestamp: parsed.deletedAt,
          payload: parsed,
        })
      } catch (error: unknown) {
        failures.push(
          buildFailure(
            filePath,
            error instanceof Error
              ? `读取远端 tombstone JSON 失败：${error.message}`
              : '读取远端 tombstone JSON 失败。',
            entityType,
          ),
        )
      }
    }
  }

  records.sort((left, right) => {
    if (left.timestamp === right.timestamp) {
      return left.filePath.localeCompare(right.filePath)
    }

    return left.timestamp.localeCompare(right.timestamp)
  })

  return {
    records,
    failures,
  }
}

const scanRemoteRecords = async (targetPath: string) => {
  const driver = new LocalFolderDriver(targetPath)
  return scanRemoteRecordsFromTarget(driver)
}

const resolveLocalDeleteTime = (dataPath: string, entityType: SyncEntityType, entityId: string) => {
  const syncChange = getSqliteSyncChangeByEntity(dataPath, entityType, entityId)

  return syncChange?.changeType === 'delete' ? syncChange.changedAt : null
}

export const applyRemoteSyncChanges = async (input: {
  dataPath: string
  records: RemoteRecord[]
}): Promise<Pick<SyncImportResult, 'appliedCount' | 'skippedCount' | 'failedCount' | 'failures'>> => {
  let appliedCount = 0
  let skippedCount = 0
  const failures: SyncImportFailure[] = []

  for (const record of input.records) {
    try {
      const localEntity = readLocalEntity(input.dataPath, record.entityType, record.entityId)
      const localDeleteTime = resolveLocalDeleteTime(
        input.dataPath,
        record.entityType,
        record.entityId,
      )

      if (record.kind === 'item') {
        if (localEntity) {
          if (record.payload.updatedAt > localEntity.updatedAt) {
            applyRemoteUpsert(input.dataPath, record.entityType, record.payload.data as SupportedSyncEntity)
            appliedCount += 1
          } else {
            skippedCount += 1
          }

          continue
        }

        if (localDeleteTime && localDeleteTime >= record.payload.updatedAt) {
          skippedCount += 1
          continue
        }

        applyRemoteUpsert(input.dataPath, record.entityType, record.payload.data as SupportedSyncEntity)
        appliedCount += 1
        continue
      }

      if (localEntity) {
        if (record.payload.deletedAt > localEntity.updatedAt) {
          applyRemoteSqliteDelete(
            input.dataPath,
            record.entityType,
            record.entityId,
            record.payload.deletedAt,
          )
          appliedCount += 1
        } else {
          skippedCount += 1
        }

        continue
      }

      if (localDeleteTime && localDeleteTime >= record.payload.deletedAt) {
        skippedCount += 1
        continue
      }

      applyRemoteSqliteDelete(
        input.dataPath,
        record.entityType,
        record.entityId,
        record.payload.deletedAt,
      )
      appliedCount += 1
    } catch (error: unknown) {
      failures.push(
        buildFailure(
          record.filePath,
          error instanceof Error ? error.message : '应用远端变化失败。',
          record.entityType,
          record.entityId,
        ),
      )
    }
  }

  return {
    appliedCount,
    skippedCount,
    failedCount: failures.length,
    failures,
  }
}

export const importRemoteChangesFromSyncFolder = async (input: {
  dataPath: string
  appVersion: string
}): Promise<SyncImportResult> => {
  const syncState = getSqliteLocalSyncState(input.dataPath)

  if (!syncState.syncTargetPath) {
    return {
      success: false,
      targetPath: '',
      deviceId: syncState.deviceId,
      appliedCount: 0,
      skippedCount: 0,
      failedCount: 1,
      failures: [
        buildFailure('', '当前还没有设置同步文件夹路径。', 'settings', SETTINGS_SYNC_ENTITY_ID),
      ],
    }
  }

  const importResult = await importRemoteChangesFromSyncTarget({
    dataPath: input.dataPath,
    appVersion: input.appVersion,
    deviceId: syncState.deviceId,
    deviceName: os.hostname(),
    platform: process.platform,
    lastSyncedAt: syncState.lastSyncedAt,
    driver: new LocalFolderDriver(syncState.syncTargetPath),
  })

  return {
    success: importResult.success,
    targetPath: syncState.syncTargetPath,
    deviceId: syncState.deviceId,
    appliedCount: importResult.appliedCount,
    skippedCount: importResult.skippedCount,
    failedCount: importResult.failedCount,
    failures: importResult.failures,
  }
}

export const importRemoteChangesFromSyncTarget = async (input: {
  dataPath: string
  appVersion: string
  deviceId: string
  deviceName: string
  platform: string
  lastSyncedAt: string | null
  driver: SyncTargetDriver
}): Promise<Pick<SyncImportResult, 'success' | 'appliedCount' | 'skippedCount' | 'failedCount' | 'failures'>> => {
  await prepareSyncTarget(input.driver, {
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    platform: input.platform,
    appVersion: input.appVersion,
    lastSyncedAt: input.lastSyncedAt,
  })

  const scanResult = await scanRemoteRecordsFromTarget(input.driver)
  const applyResult = await applyRemoteSyncChanges({
    dataPath: input.dataPath,
    records: scanResult.records,
  })
  const failures = [...scanResult.failures, ...applyResult.failures]

  if (scanResult.records.length > 0) {
    await prepareSyncTarget(input.driver, {
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      platform: input.platform,
      appVersion: input.appVersion,
      lastSyncedAt: input.lastSyncedAt,
    })
  }

  return {
    success: failures.length === 0,
    appliedCount: applyResult.appliedCount,
    skippedCount: applyResult.skippedCount,
    failedCount: failures.length,
    failures,
  }
}

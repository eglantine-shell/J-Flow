import type { SyncDeviceInfoFile, SyncInfoFile } from '../types.js'
import type { SyncTargetDriver } from './types.js'

export const SYNC_VERSION = 1
export const SYNC_APP_NAME: SyncInfoFile['appName'] = 'J-Flow'
export const LOCK_TTL_MS = 2 * 60 * 1000

export const ITEM_DIRECTORIES = [
  'settings',
  'sceneTags',
  'activityTypes',
  'taskTemplates',
  'recurringTaskInstances',
  'dayPlanItems',
  'logbookEntries',
  'segmentedProgressLogs',
] as const

export type SyncLockFile = {
  deviceId: string
  createdAt: string
  expiresAt: string
  appVersion: string
  operation: 'sync-now'
}

export type AcquireSyncLockResult =
  | {
      acquired: true
      reason: null
      lockLogicalPath: string
    }
  | {
      acquired: false
      reason: string
      lockLogicalPath: null
    }

const nowIso = () => new Date().toISOString()

export const buildSyncInfoLogicalPath = () => 'sync-info.json'
export const buildDevicesDirectoryLogicalPath = () => 'devices'
export const buildDeviceInfoLogicalPath = (deviceId: string) => `devices/${deviceId}.json`
export const buildLockDirectoryLogicalPath = () => 'locks'
export const buildLockFileLogicalPath = (deviceId: string) => `locks/sync_${deviceId}.json`

export const validateSyncInfoFile = (value: unknown): SyncInfoFile => {
  if (!value || typeof value !== 'object') {
    throw new Error('sync-info.json 不是合法的 JSON 对象。')
  }

  const candidate = value as Record<string, unknown>

  if (candidate.syncVersion !== SYNC_VERSION) {
    throw new Error('sync-info.json 的 syncVersion 不受当前版本支持。')
  }

  if (candidate.appName !== SYNC_APP_NAME) {
    throw new Error('sync-info.json 的 appName 不是 J-Flow。')
  }

  if (
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    typeof candidate.minSupportedAppVersion !== 'string'
  ) {
    throw new Error('sync-info.json 缺少必要字段。')
  }

  return {
    syncVersion: SYNC_VERSION,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    appName: SYNC_APP_NAME,
    minSupportedAppVersion: candidate.minSupportedAppVersion,
  }
}

const isNotFoundError = (error: unknown) => {
  const candidate = error as
    | {
        code?: string
        status?: number
      }
    | undefined

  return candidate?.code === 'ENOENT' || candidate?.code === 'not_found' || candidate?.status === 404
}

export const readSyncInfo = async (driver: SyncTargetDriver) => {
  try {
    const content = await driver.readText(buildSyncInfoLogicalPath())
    return validateSyncInfoFile(JSON.parse(content) as unknown)
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      throw error
    }

    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(`读取 sync-info.json 失败：${message}`)
  }
}

export const writeSyncInfo = async (driver: SyncTargetDriver, syncInfo: SyncInfoFile) => {
  await driver.safeWriteJson(buildSyncInfoLogicalPath(), syncInfo)
}

export const ensureSyncTargetStructure = async (driver: SyncTargetDriver) => {
  await driver.ensureDir(buildDevicesDirectoryLogicalPath())
  await driver.ensureDir(buildLockDirectoryLogicalPath())

  for (const directoryName of ITEM_DIRECTORIES) {
    await driver.ensureDir(`items/${directoryName}`)
    await driver.ensureDir(`tombstones/${directoryName}`)
  }
}

export const touchSyncInfo = async (driver: SyncTargetDriver, appVersion: string) => {
  const timestamp = nowIso()
  const existing = await readSyncInfo(driver).catch((error: unknown) => {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  })

  const syncInfo: SyncInfoFile = existing
    ? {
        ...existing,
        updatedAt: timestamp,
      }
    : {
        syncVersion: SYNC_VERSION,
        createdAt: timestamp,
        updatedAt: timestamp,
        appName: SYNC_APP_NAME,
        minSupportedAppVersion: appVersion,
      }

  await writeSyncInfo(driver, syncInfo)

  return {
    syncInfo,
    wasInitialized: !existing,
  }
}

export const updateDeviceInfo = async (
  driver: SyncTargetDriver,
  input: {
    deviceId: string
    deviceName: string
    platform: string
    appVersion: string
    lastSyncedAt: string | null
  },
) => {
  const deviceInfo: SyncDeviceInfoFile = {
    syncVersion: SYNC_VERSION,
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    platform: input.platform,
    appVersion: input.appVersion,
    lastSeenAt: nowIso(),
    lastSyncedAt: input.lastSyncedAt,
  }

  await driver.safeWriteJson(buildDeviceInfoLogicalPath(input.deviceId), deviceInfo)

  return deviceInfo
}

export const prepareSyncTarget = async (
  driver: SyncTargetDriver,
  input: {
    deviceId: string
    deviceName: string
    platform: string
    appVersion: string
    lastSyncedAt: string | null
  },
) => {
  await ensureSyncTargetStructure(driver)
  const { syncInfo, wasInitialized } = await touchSyncInfo(driver, input.appVersion)
  const deviceInfo = await updateDeviceInfo(driver, input)

  return {
    syncInfo,
    deviceInfo,
    wasInitialized,
  }
}

export const acquireSyncLock = async (
  driver: SyncTargetDriver,
  input: {
    deviceId: string
    appVersion: string
  },
): Promise<AcquireSyncLockResult> => {
  const lockDirectoryLogicalPath = buildLockDirectoryLogicalPath()
  await driver.ensureDir(lockDirectoryLogicalPath)
  const lockEntries = await driver.list(lockDirectoryLogicalPath).catch(() => [])
  const now = Date.now()

  for (const lockEntry of lockEntries.filter(
    (entry) => entry.kind === 'file' && entry.logicalPath.endsWith('.json'),
  )) {
    try {
      const parsed = JSON.parse(await driver.readText(lockEntry.logicalPath)) as Partial<SyncLockFile>
      const expiresAt = typeof parsed.expiresAt === 'string' ? Date.parse(parsed.expiresAt) : Number.NaN
      const lockDeviceId = typeof parsed.deviceId === 'string' ? parsed.deviceId : null

      if (!lockDeviceId) {
        await driver.delete(lockEntry.logicalPath)
        continue
      }

      if (Number.isNaN(expiresAt) || expiresAt <= now) {
        await driver.delete(lockEntry.logicalPath)
        continue
      }

      if (lockDeviceId !== input.deviceId) {
        return {
          acquired: false,
          reason: `另一台设备正在同步：${lockDeviceId}`,
          lockLogicalPath: null,
        }
      }
    } catch {
      await driver.delete(lockEntry.logicalPath).catch(() => undefined)
    }
  }

  const createdAt = nowIso()
  const expiresAt = new Date(Date.parse(createdAt) + LOCK_TTL_MS).toISOString()
  const lockLogicalPath = buildLockFileLogicalPath(input.deviceId)

  await driver.safeWriteJson(lockLogicalPath, {
    deviceId: input.deviceId,
    createdAt,
    expiresAt,
    appVersion: input.appVersion,
    operation: 'sync-now',
  } satisfies SyncLockFile)

  return {
    acquired: true,
    reason: null,
    lockLogicalPath,
  }
}

export const releaseSyncLock = async (driver: SyncTargetDriver, deviceId: string) => {
  await driver.delete(buildLockFileLogicalPath(deviceId))
}

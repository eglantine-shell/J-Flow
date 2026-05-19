import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import path from 'node:path'

import type { SyncDeviceInfoFile, SyncInfoFile, SyncTargetTestResult } from './types.js'

const SYNC_VERSION = 1
const SYNC_APP_NAME: SyncInfoFile['appName'] = 'J-Flow'
const SYNC_INFO_FILENAME = 'sync-info.json'
const LOCK_TTL_MS = 2 * 60 * 1000

const ITEM_DIRECTORIES = [
  'settings',
  'sceneTags',
  'activityTypes',
  'taskTemplates',
  'recurringTaskInstances',
  'dayPlanItems',
  'logbookEntries',
  'segmentedProgressLogs',
] as const

const nowIso = () => new Date().toISOString()

const buildSyncInfoPath = (targetPath: string) => path.join(targetPath, SYNC_INFO_FILENAME)
const buildDevicesDirectoryPath = (targetPath: string) => path.join(targetPath, 'devices')
const buildDeviceInfoPath = (targetPath: string, deviceId: string) =>
  path.join(buildDevicesDirectoryPath(targetPath), `${deviceId}.json`)
const buildLockDirectoryPath = (targetPath: string) => path.join(targetPath, 'locks')
const buildLockFilePath = (targetPath: string, deviceId: string) =>
  path.join(buildLockDirectoryPath(targetPath), `sync_${deviceId}.json`)

const safeWriteJsonAtomic = async (filePath: string, data: unknown) => {
  const directoryPath = path.dirname(filePath)
  const tmpPath = `${filePath}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`
  const content = `${JSON.stringify(data, null, 2)}\n`

  await mkdir(directoryPath, { recursive: true })
  await writeFile(tmpPath, content, 'utf8')
  await rename(tmpPath, filePath)
}

const validateSyncInfoFile = (value: unknown): SyncInfoFile => {
  if (!value || typeof value !== 'object') {
    throw new Error('sync-info.json 不是合法的 JSON 对象。')
  }

  const candidate = value as Record<string, unknown>

  if (candidate.syncVersion !== SYNC_VERSION) {
    throw new Error(`sync-info.json 的 syncVersion 不受当前版本支持。`)
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

const readSyncInfoFile = async (targetPath: string) => {
  const filePath = buildSyncInfoPath(targetPath)
  const content = await readFile(filePath, 'utf8')

  return validateSyncInfoFile(JSON.parse(content) as unknown)
}

const ensureDirectoryExists = async (directoryPath: string) => {
  const stats = await stat(directoryPath).catch(() => null)

  if (!stats) {
    throw new Error('同步文件夹路径不存在。')
  }

  if (!stats.isDirectory()) {
    throw new Error('同步文件夹路径不是目录。')
  }
}

const verifyReadWriteRoundTrip = async (targetPath: string) => {
  const tempFilePath = path.join(
    targetPath,
    `.j-flow-sync-write-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
  )
  const payload = {
    ok: true,
    createdAt: nowIso(),
  }

  await writeFile(tempFilePath, JSON.stringify(payload), 'utf8')
  const content = await readFile(tempFilePath, 'utf8')
  await rm(tempFilePath, { force: true })

  const parsed = JSON.parse(content) as Record<string, unknown>

  if (parsed.ok !== true) {
    throw new Error('同步文件夹临时写入校验失败。')
  }
}

const ensureSyncDirectoryStructure = async (targetPath: string) => {
  await mkdir(buildDevicesDirectoryPath(targetPath), { recursive: true })
  await mkdir(path.join(targetPath, 'locks'), { recursive: true })

  for (const directoryName of ITEM_DIRECTORIES) {
    await mkdir(path.join(targetPath, 'items', directoryName), { recursive: true })
    await mkdir(path.join(targetPath, 'tombstones', directoryName), { recursive: true })
  }
}

const ensureSyncInfo = async (targetPath: string, appVersion: string) => {
  const filePath = buildSyncInfoPath(targetPath)
  const timestamp = nowIso()
  const existing = await readFile(filePath, 'utf8')
    .then((content) => validateSyncInfoFile(JSON.parse(content) as unknown))
    .catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
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

  await safeWriteJsonAtomic(filePath, syncInfo)

  return {
    syncInfo,
    wasInitialized: !existing,
  }
}

const writeDeviceInfo = async (input: {
  targetPath: string
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  lastSyncedAt: string | null
}) => {
  const deviceInfo: SyncDeviceInfoFile = {
    syncVersion: SYNC_VERSION,
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    platform: input.platform,
    appVersion: input.appVersion,
    lastSeenAt: nowIso(),
    lastSyncedAt: input.lastSyncedAt,
  }

  await safeWriteJsonAtomic(buildDeviceInfoPath(input.targetPath, input.deviceId), deviceInfo)

  return deviceInfo
}

export const updateSyncDeviceInfo = async (input: {
  targetPath: string
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  lastSyncedAt: string | null
}) => writeDeviceInfo(input)

type SyncLockFile = {
  deviceId: string
  createdAt: string
  expiresAt: string
  appVersion: string
  operation: 'sync-now'
}

export const acquireSyncLock = async (input: {
  targetPath: string
  deviceId: string
  appVersion: string
}) => {
  const lockDirectoryPath = buildLockDirectoryPath(input.targetPath)
  await mkdir(lockDirectoryPath, { recursive: true })
  const lockNames = await readdir(lockDirectoryPath).catch(() => [])
  const now = Date.now()

  for (const lockName of lockNames.filter((name) => name.endsWith('.json'))) {
    const lockPath = path.join(lockDirectoryPath, lockName)

    try {
      const parsed = JSON.parse(await readFile(lockPath, 'utf8')) as Partial<SyncLockFile>
      const expiresAt = typeof parsed.expiresAt === 'string' ? Date.parse(parsed.expiresAt) : Number.NaN
      const lockDeviceId = typeof parsed.deviceId === 'string' ? parsed.deviceId : null

      if (!lockDeviceId) {
        await rm(lockPath, { force: true })
        continue
      }

      if (Number.isNaN(expiresAt) || expiresAt <= now) {
        await rm(lockPath, { force: true })
        continue
      }

      if (lockDeviceId !== input.deviceId) {
        return {
          acquired: false,
          reason: `另一台设备正在同步：${lockDeviceId}`,
          lockPath: null,
        }
      }
    } catch {
      await rm(lockPath, { force: true }).catch(() => undefined)
    }
  }

  const createdAt = nowIso()
  const expiresAt = new Date(Date.parse(createdAt) + LOCK_TTL_MS).toISOString()
  const lockPath = buildLockFilePath(input.targetPath, input.deviceId)

  await safeWriteJsonAtomic(lockPath, {
    deviceId: input.deviceId,
    createdAt,
    expiresAt,
    appVersion: input.appVersion,
    operation: 'sync-now',
  } satisfies SyncLockFile)

  return {
    acquired: true,
    reason: null,
    lockPath,
  }
}

export const releaseSyncLock = async (targetPath: string, deviceId: string) => {
  await rm(buildLockFilePath(targetPath, deviceId), { force: true })
}

export const getSyncItemDirectoryPath = (
  targetPath: string,
  directoryName: (typeof ITEM_DIRECTORIES)[number],
) => path.join(targetPath, 'items', directoryName)

export const getSyncTombstoneDirectoryPath = (
  targetPath: string,
  directoryName: (typeof ITEM_DIRECTORIES)[number],
) => path.join(targetPath, 'tombstones', directoryName)

export const prepareSyncTargetDirectory = async (input: {
  targetPath: string
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  lastSyncedAt: string | null
}) => {
  await ensureDirectoryExists(input.targetPath)
  await access(input.targetPath, fsConstants.R_OK | fsConstants.W_OK)
  await ensureSyncDirectoryStructure(input.targetPath)

  const { syncInfo, wasInitialized } = await ensureSyncInfo(input.targetPath, input.appVersion)
  const deviceInfo = await writeDeviceInfo(input)

  return {
    syncInfo,
    deviceInfo,
    wasInitialized,
  }
}

export const touchSyncTargetDirectoryMetadata = async (input: {
  targetPath: string
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  lastSyncedAt: string | null
}) => prepareSyncTargetDirectory(input)

export const testSyncTargetDirectory = async (input: {
  targetPath: string
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  lastSyncedAt: string | null
}): Promise<SyncTargetTestResult> => {
  try {
    await verifyReadWriteRoundTrip(input.targetPath)
    const { syncInfo, wasInitialized } = await prepareSyncTargetDirectory(input)

    return {
      success: true,
      targetPath: input.targetPath,
      syncVersion: syncInfo.syncVersion,
      deviceId: input.deviceId,
      message: wasInitialized
        ? '已初始化新的 J-Flow Sync 目录并完成读写测试。'
        : '已复用现有 J-Flow Sync 目录并完成读写测试。',
    }
  } catch (error: unknown) {
    return {
      success: false,
      targetPath: input.targetPath,
      syncVersion: null,
      deviceId: input.deviceId,
      message: '同步文件夹测试失败。',
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

export const readSyncDirectoryInfo = async (targetPath: string) => readSyncInfoFile(targetPath)

export { ITEM_DIRECTORIES, safeWriteJsonAtomic }

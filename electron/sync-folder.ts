import { access, mkdir, rename, stat, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import path from 'node:path'

import {
  ITEM_DIRECTORIES,
  acquireSyncLock as acquireSyncLockForDriver,
  buildDeviceInfoLogicalPath,
  buildDevicesDirectoryLogicalPath,
  buildLockFileLogicalPath,
  buildSyncInfoLogicalPath,
  LocalFolderDriver,
  prepareSyncTarget,
  readSyncInfo,
  releaseSyncLock as releaseSyncLockForDriver,
  resolveLocalFolderPath,
  updateDeviceInfo as updateDeviceInfoForDriver,
} from './sync-target/index.js'
import type { SyncTargetTestResult } from './types.js'

const createLocalFolderDriver = (targetPath: string) => new LocalFolderDriver(targetPath)

const buildSyncInfoPath = (targetPath: string) => resolveLocalFolderPath(targetPath, buildSyncInfoLogicalPath())
const buildLockFilePath = (targetPath: string, deviceId: string) =>
  resolveLocalFolderPath(targetPath, buildLockFileLogicalPath(deviceId))

const nowIso = () => new Date().toISOString()

const safeWriteJsonAtomic = async (filePath: string, data: unknown) => {
  const directoryPath = path.dirname(filePath)
  const tmpPath = `${filePath}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`
  const content = `${JSON.stringify(data, null, 2)}\n`

  await mkdir(directoryPath, { recursive: true })
  await writeFile(tmpPath, content, 'utf8')
  await rename(tmpPath, filePath)
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
  const driver = createLocalFolderDriver(targetPath)
  const tempLogicalPath = `.j-flow-sync-write-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`
  const payload = {
    ok: true,
    createdAt: nowIso(),
  }

  await driver.safeWriteJson(tempLogicalPath, payload)
  const content = await driver.readText(tempLogicalPath)
  await driver.delete(tempLogicalPath)

  const parsed = JSON.parse(content) as Record<string, unknown>

  if (parsed.ok !== true) {
    throw new Error('同步文件夹临时写入校验失败。')
  }
}

export const updateSyncDeviceInfo = async (input: {
  targetPath: string
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  lastSyncedAt: string | null
}) =>
  updateDeviceInfoForDriver(createLocalFolderDriver(input.targetPath), {
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    platform: input.platform,
    appVersion: input.appVersion,
    lastSyncedAt: input.lastSyncedAt,
  })

export const acquireSyncLock = async (input: {
  targetPath: string
  deviceId: string
  appVersion: string
}) => {
  const result = await acquireSyncLockForDriver(createLocalFolderDriver(input.targetPath), {
    deviceId: input.deviceId,
    appVersion: input.appVersion,
  })

  return result.acquired
    ? {
        acquired: true as const,
        reason: null,
        lockPath: buildLockFilePath(input.targetPath, input.deviceId),
      }
    : {
        acquired: false as const,
        reason: result.reason,
        lockPath: null,
      }
}

export const releaseSyncLock = async (targetPath: string, deviceId: string) =>
  releaseSyncLockForDriver(createLocalFolderDriver(targetPath), deviceId)

export const getSyncItemDirectoryPath = (
  targetPath: string,
  directoryName: (typeof ITEM_DIRECTORIES)[number],
) => resolveLocalFolderPath(targetPath, `items/${directoryName}`)

export const getSyncTombstoneDirectoryPath = (
  targetPath: string,
  directoryName: (typeof ITEM_DIRECTORIES)[number],
) => resolveLocalFolderPath(targetPath, `tombstones/${directoryName}`)

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

  return prepareSyncTarget(createLocalFolderDriver(input.targetPath), {
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    platform: input.platform,
    appVersion: input.appVersion,
    lastSyncedAt: input.lastSyncedAt,
  })
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

export const readSyncDirectoryInfo = async (targetPath: string) => readSyncInfo(createLocalFolderDriver(targetPath))

export {
  ITEM_DIRECTORIES,
  buildDeviceInfoLogicalPath,
  buildDevicesDirectoryLogicalPath,
  buildSyncInfoLogicalPath,
  buildSyncInfoPath,
  safeWriteJsonAtomic,
}

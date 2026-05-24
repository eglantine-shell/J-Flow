import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  LocalFolderDriver,
  acquireSyncLock,
  buildDeviceInfoLogicalPath,
  buildLockFileLogicalPath,
  buildSyncInfoLogicalPath,
  prepareSyncTarget,
  readSyncInfo,
  releaseSyncLock,
  resolveLocalFolderPath,
  updateDeviceInfo,
} from './index.js'

const tempDirectories: string[] = []

const createTempDirectory = async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'j-flow-sync-metadata-test-'))
  tempDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0, tempDirectories.length).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  )
})

describe('electron/sync-target/metadata', () => {
  it('creates the expected sync target structure for an empty target', async () => {
    const targetPath = await createTempDirectory()
    const driver = new LocalFolderDriver(targetPath)

    await prepareSyncTarget(driver, {
      deviceId: 'device-a',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })

    await expect(readFile(resolveLocalFolderPath(targetPath, buildSyncInfoLogicalPath()), 'utf8')).resolves.toContain(
      '"appName": "J-Flow"',
    )
    await expect(
      readFile(resolveLocalFolderPath(targetPath, buildDeviceInfoLogicalPath('device-a')), 'utf8'),
    ).resolves.toContain('"deviceId": "device-a"')
    expect((await stat(resolveLocalFolderPath(targetPath, 'items/dayPlanItems'))).isDirectory()).toBe(true)
    expect((await stat(resolveLocalFolderPath(targetPath, 'tombstones/logbookEntries'))).isDirectory()).toBe(true)
  })

  it('reuses a valid sync-info.json and preserves createdAt while refreshing updatedAt', async () => {
    const targetPath = await createTempDirectory()
    const driver = new LocalFolderDriver(targetPath)

    const first = await prepareSyncTarget(driver, {
      deviceId: 'device-a',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })

    await new Promise((resolve) => setTimeout(resolve, 5))

    const second = await prepareSyncTarget(driver, {
      deviceId: 'device-a',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })

    expect(first.syncInfo.createdAt).toBe(second.syncInfo.createdAt)
    expect(Date.parse(second.syncInfo.updatedAt)).toBeGreaterThanOrEqual(Date.parse(first.syncInfo.updatedAt))
  })

  it('creates sync-info.json when directories already exist but the file is missing', async () => {
    const targetPath = await createTempDirectory()
    const driver = new LocalFolderDriver(targetPath)

    await driver.ensureDir('devices')
    await driver.ensureDir('locks')
    await driver.ensureDir('items/dayPlanItems')
    await driver.ensureDir('tombstones/dayPlanItems')

    const result = await prepareSyncTarget(driver, {
      deviceId: 'device-a',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })

    expect(result.wasInitialized).toBe(true)
    await expect(readFile(resolveLocalFolderPath(targetPath, buildSyncInfoLogicalPath()), 'utf8')).resolves.toContain(
      '"syncVersion": 1',
    )
  })

  it('returns an error for invalid sync-info.json', async () => {
    const targetPath = await createTempDirectory()
    const driver = new LocalFolderDriver(targetPath)

    await writeFile(
      resolveLocalFolderPath(targetPath, buildSyncInfoLogicalPath()),
      JSON.stringify({ syncVersion: 999, appName: 'J-Flow' }),
      'utf8',
    )

    await expect(readSyncInfo(driver)).rejects.toThrow(/sync-info\.json/)
  })

  it('writes device info with the existing metadata shape', async () => {
    const targetPath = await createTempDirectory()
    const driver = new LocalFolderDriver(targetPath)

    await driver.ensureDir('devices')

    const deviceInfo = await updateDeviceInfo(driver, {
      deviceId: 'device-a',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: '2026-05-20T10:00:00.000Z',
    })

    expect(deviceInfo).toMatchObject({
      syncVersion: 1,
      deviceId: 'device-a',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: '2026-05-20T10:00:00.000Z',
    })
  })

  it('keeps lock conflict behavior unchanged for another active device', async () => {
    const targetPath = await createTempDirectory()
    const driver = new LocalFolderDriver(targetPath)

    await driver.ensureDir('locks')

    const first = await acquireSyncLock(driver, {
      deviceId: 'device-a',
      appVersion: '0.1.0',
    })
    const second = await acquireSyncLock(driver, {
      deviceId: 'device-b',
      appVersion: '0.1.0',
    })

    expect(first).toMatchObject({
      acquired: true,
      reason: null,
      lockLogicalPath: 'locks/sync_device-a.json',
    })
    expect(second).toMatchObject({
      acquired: false,
      reason: '另一台设备正在同步：device-a',
      lockLogicalPath: null,
    })
  })

  it('cleans up expired locks before acquiring a new lock', async () => {
    const targetPath = await createTempDirectory()
    const driver = new LocalFolderDriver(targetPath)

    await driver.ensureDir('locks')
    await driver.safeWriteJson(buildLockFileLogicalPath('expired-device'), {
      deviceId: 'expired-device',
      createdAt: '2026-05-18T09:00:00.000Z',
      expiresAt: '2026-05-18T09:01:00.000Z',
      appVersion: '0.1.0',
      operation: 'sync-now',
    })

    const result = await acquireSyncLock(driver, {
      deviceId: 'device-b',
      appVersion: '0.1.0',
    })

    expect(result.acquired).toBe(true)
    await expect(driver.readText(buildLockFileLogicalPath('expired-device'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('cleans up malformed lock files before continuing', async () => {
    const targetPath = await createTempDirectory()
    const driver = new LocalFolderDriver(targetPath)

    await driver.ensureDir('locks')
    await writeFile(resolveLocalFolderPath(targetPath, buildLockFileLogicalPath('broken-device')), '{', 'utf8')

    const result = await acquireSyncLock(driver, {
      deviceId: 'device-b',
      appVersion: '0.1.0',
    })

    expect(result.acquired).toBe(true)
    await expect(driver.readText(buildLockFileLogicalPath('broken-device'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('releases only the current device lock', async () => {
    const targetPath = await createTempDirectory()
    const driver = new LocalFolderDriver(targetPath)

    await driver.ensureDir('locks')
    await driver.safeWriteJson(buildLockFileLogicalPath('device-a'), {
      deviceId: 'device-a',
      createdAt: '2026-05-20T10:00:00.000Z',
      expiresAt: '2099-05-20T10:02:00.000Z',
      appVersion: '0.1.0',
      operation: 'sync-now',
    })
    await driver.safeWriteJson(buildLockFileLogicalPath('device-b'), {
      deviceId: 'device-b',
      createdAt: '2026-05-20T10:00:00.000Z',
      expiresAt: '2099-05-20T10:02:00.000Z',
      appVersion: '0.1.0',
      operation: 'sync-now',
    })

    await releaseSyncLock(driver, 'device-a')

    await expect(driver.readText(buildLockFileLogicalPath('device-a'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(driver.readText(buildLockFileLogicalPath('device-b'))).resolves.toContain('"deviceId": "device-b"')
  })
})

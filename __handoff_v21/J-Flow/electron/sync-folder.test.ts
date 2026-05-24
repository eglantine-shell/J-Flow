import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  acquireSyncLock,
  readSyncDirectoryInfo,
  releaseSyncLock,
  testSyncTargetDirectory,
} from './sync-folder'

const tempDirectories: string[] = []

const createTempDirectory = async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'j-flow-sync-folder-test-'))
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

describe('electron/sync-folder', () => {
  it('initializes a valid J-Flow sync directory from an empty folder', async () => {
    const targetPath = await createTempDirectory()

    const result = await testSyncTargetDirectory({
      targetPath,
      deviceId: 'device-sync-test',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })

    expect(result).toMatchObject({
      success: true,
      targetPath,
      syncVersion: 1,
      deviceId: 'device-sync-test',
    })

    const syncInfo = await readSyncDirectoryInfo(targetPath)
    const deviceInfo = JSON.parse(
      await readFile(path.join(targetPath, 'devices/device-sync-test.json'), 'utf8'),
    ) as Record<string, unknown>

    expect(syncInfo).toMatchObject({
      syncVersion: 1,
      appName: 'J-Flow',
      minSupportedAppVersion: '0.1.0',
    })
    expect(deviceInfo).toMatchObject({
      syncVersion: 1,
      deviceId: 'device-sync-test',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })
  })

  it('reuses an existing valid sync directory without overwriting createdAt', async () => {
    const targetPath = await createTempDirectory()

    const first = await testSyncTargetDirectory({
      targetPath,
      deviceId: 'device-sync-test',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })
    const firstInfo = await readSyncDirectoryInfo(targetPath)

    await mkdir(path.join(targetPath, 'custom-notes'), { recursive: true })

    const second = await testSyncTargetDirectory({
      targetPath,
      deviceId: 'device-sync-test',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })
    const secondInfo = await readSyncDirectoryInfo(targetPath)

    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(firstInfo.createdAt).toBe(secondInfo.createdAt)
    expect(secondInfo.updatedAt >= firstInfo.updatedAt).toBe(true)
  })

  it('returns an error for an invalid sync-info.json file', async () => {
    const targetPath = await createTempDirectory()

    await writeFile(
      path.join(targetPath, 'sync-info.json'),
      JSON.stringify({
        syncVersion: 999,
        appName: 'J-Flow',
      }),
      'utf8',
    )

    const result = await testSyncTargetDirectory({
      targetPath,
      deviceId: 'device-sync-test',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('sync-info.json')
  })

  it('keeps lock conflict behavior unchanged when another device holds a valid lock', async () => {
    const targetPath = await createTempDirectory()

    await testSyncTargetDirectory({
      targetPath,
      deviceId: 'device-a',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })

    const firstLock = await acquireSyncLock({
      targetPath,
      deviceId: 'device-a',
      appVersion: '0.1.0',
    })
    const secondLock = await acquireSyncLock({
      targetPath,
      deviceId: 'device-b',
      appVersion: '0.1.0',
    })

    expect(firstLock.acquired).toBe(true)
    expect(secondLock).toMatchObject({
      acquired: false,
      reason: '另一台设备正在同步：device-a',
      lockPath: null,
    })

    await releaseSyncLock(targetPath, 'device-a')
  })

  it('cleans up expired lock files before acquiring a new lock', async () => {
    const targetPath = await createTempDirectory()

    await testSyncTargetDirectory({
      targetPath,
      deviceId: 'device-a',
      deviceName: 'Test Mac',
      platform: 'darwin',
      appVersion: '0.1.0',
      lastSyncedAt: null,
    })

    await writeFile(
      path.join(targetPath, 'locks/sync_expired-device.json'),
      JSON.stringify({
        deviceId: 'expired-device',
        createdAt: '2026-05-18T09:00:00.000Z',
        expiresAt: '2026-05-18T09:01:00.000Z',
        appVersion: '0.1.0',
        operation: 'sync-now',
      }),
      'utf8',
    )

    const lock = await acquireSyncLock({
      targetPath,
      deviceId: 'device-b',
      appVersion: '0.1.0',
    })

    expect(lock.acquired).toBe(true)
    await expect(readFile(path.join(targetPath, 'locks/sync_expired-device.json'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    })

    await releaseSyncLock(targetPath, 'device-b')
  })
})

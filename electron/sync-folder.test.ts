import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { readSyncDirectoryInfo, testSyncTargetDirectory } from './sync-folder'

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
})

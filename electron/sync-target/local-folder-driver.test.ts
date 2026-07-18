import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { LocalFolderDriver, resolveLocalFolderPath } from './local-folder-driver.js'

const tempDirectories: string[] = []

const createTempDirectory = async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'j-flow-local-folder-driver-test-'))
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

describe('electron/sync-target/local-folder-driver', () => {
  it('maps logicalPath to a path under basePath', async () => {
    const basePath = await createTempDirectory()

    expect(resolveLocalFolderPath(basePath, 'items/dayPlanItems/x.json')).toBe(
      path.join(basePath, 'items', 'dayPlanItems', 'x.json'),
    )
  })

  it('supports writeText and readText', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    await driver.writeText('items/dayPlanItems/a.json', '{"ok":true}')

    await expect(driver.readText('items/dayPlanItems/a.json')).resolves.toBe('{"ok":true}')
  })

  it('supports exists', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    expect(await driver.exists('items/dayPlanItems/missing.json')).toBe(false)

    await driver.writeText('items/dayPlanItems/existing.json', 'hello')

    expect(await driver.exists('items/dayPlanItems/existing.json')).toBe(true)
  })

  it('supports ensureDir for logical directories', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    await driver.ensureDir('items/dayPlanItems/nested')

    const directoryStats = await stat(path.join(basePath, 'items', 'dayPlanItems', 'nested'))
    expect(directoryStats.isDirectory()).toBe(true)
  })

  it('lists entries under a logical prefix and returns logicalPath values', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    await driver.writeText('items/dayPlanItems/a.json', 'a')
    await driver.writeText('items/dayPlanItems/nested/b.json', 'b')
    await driver.writeText('items/sceneTags/c.json', 'c')

    const entries = await driver.list('items/dayPlanItems')

    expect(entries.map((entry) => entry.logicalPath).sort()).toEqual([
      'items/dayPlanItems/a.json',
      'items/dayPlanItems/nested',
      'items/dayPlanItems/nested/b.json',
    ])
    expect(entries.every((entry) => entry.logicalPath.startsWith('items/dayPlanItems'))).toBe(true)
  })

  it('supports delete', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    await driver.writeText('items/dayPlanItems/delete-me.json', 'delete me')
    await driver.delete('items/dayPlanItems/delete-me.json')

    expect(await driver.exists('items/dayPlanItems/delete-me.json')).toBe(false)
  })

  it('supports safeWriteJson and writes readable json content', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    await driver.safeWriteJson('devices/device-1.json', {
      syncVersion: 1,
      deviceId: 'device-1',
    })

    const content = await driver.readText('devices/device-1.json')

    expect(JSON.parse(content)).toMatchObject({
      syncVersion: 1,
      deviceId: 'device-1',
    })
  })

  it('does not leave temporary files in cloud-synced folders', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    await driver.safeWriteJson('devices/device-1.json', {
      syncVersion: 1,
      deviceId: 'device-1',
    })

    const deviceFiles = await readdir(path.join(basePath, 'devices'))

    expect(deviceFiles).toEqual(['device-1.json'])
    expect(deviceFiles.some((fileName) => fileName.endsWith('.tmp'))).toBe(false)
  })

  it('rejects windows-style logical paths', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    await expect(driver.writeText('items\\dayPlanItems\\x.json', 'bad')).rejects.toThrow('POSIX')
  })

  it('rejects parent traversal and does not escape basePath', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)
    const escapedPath = path.join(basePath, '..', 'escaped.json')

    await expect(driver.writeText('../escaped.json', 'bad')).rejects.toThrow('逃逸')
    expect(await stat(escapedPath).catch(() => null)).toBeNull()
  })

  it('rejects absolute logical paths', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    await expect(driver.writeText('/tmp/escaped.json', 'bad')).rejects.toThrow('绝对路径')
  })

  it('stores files using the current sync folder structure', async () => {
    const basePath = await createTempDirectory()
    const driver = new LocalFolderDriver(basePath)

    await driver.safeWriteJson('items/dayPlanItems/check.json', { ok: true })

    const physicalContent = await readFile(path.join(basePath, 'items', 'dayPlanItems', 'check.json'), 'utf8')
    expect(JSON.parse(physicalContent)).toMatchObject({ ok: true })
  })
})

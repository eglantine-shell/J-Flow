import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import {
  AUTO_SYNC_MIN_INTERVAL_MS,
  createSyncCoordinator,
  registerAutoSyncTriggers,
} from './auto-sync'
import type { LocalSyncState, SyncNowResult } from './types'

const createSyncState = (
  overrides: Partial<LocalSyncState> = {},
): LocalSyncState => ({
  deviceId: 'device-auto-sync-test',
  lastSyncedAt: null,
  lastSyncStatus: null,
  lastSyncError: null,
  lastSyncAttemptedAt: null,
  lastSyncResult: null,
  syncTargetPath: '/tmp/j-flow-sync',
  syncTargetConfig: null,
  ...overrides,
})

const createSyncResult = (
  overrides: Partial<SyncNowResult> = {},
): SyncNowResult => ({
  success: true,
  status: 'success',
  startedAt: '2026-05-22T10:00:00.000Z',
  completedAt: '2026-05-22T10:00:05.000Z',
  targetPath: '/tmp/j-flow-sync',
  deviceId: 'device-auto-sync-test',
  backupCreated: true,
  backupFilePath: '/tmp/backup.json',
  importResult: {
    appliedCount: 0,
    skippedCount: 0,
    failedCount: 0,
  },
  exportResult: {
    exportedCount: 0,
    failedCount: 0,
  },
  lastSyncedAtWritten: true,
  errors: [],
  warnings: [],
  ...overrides,
})

describe('electron/auto-sync createSyncCoordinator', () => {
  it('reuses the active sync promise for overlapping manual sync calls', async () => {
    let resolveSync: ((value: SyncNowResult) => void) | null = null
    const runManualSync = vi.fn(
      () =>
        new Promise<SyncNowResult>((resolve) => {
          resolveSync = resolve
        }),
    )
    const coordinator = createSyncCoordinator({
      getLocalSyncState: vi.fn(() => createSyncState()),
      runManualSync,
      nowMs: vi.fn(() => 0),
    })

    const firstPromise = coordinator.runManualSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
    })
    const secondPromise = coordinator.runManualSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
    })

    expect(runManualSync).toHaveBeenCalledTimes(1)
    expect(coordinator.isSyncInProgress()).toBe(true)

    resolveSync?.(createSyncResult())

    const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise])

    expect(firstResult).toEqual(secondResult)
    expect(coordinator.isSyncInProgress()).toBe(false)
  })

  it('skips auto sync when no sync target is configured', async () => {
    const runManualSync = vi.fn(async () => createSyncResult())
    const coordinator = createSyncCoordinator({
      getLocalSyncState: vi.fn(() =>
        createSyncState({
          syncTargetPath: null,
          syncTargetConfig: null,
        }),
      ),
      runManualSync,
      nowMs: vi.fn(() => 0),
    })

    const result = await coordinator.maybeAutoSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
      reason: 'startup',
    })

    expect(result).toEqual({
      triggered: false,
      reason: 'startup',
      skippedReason: 'no_target',
    })
    expect(runManualSync).not.toHaveBeenCalled()
  })

  it('skips auto sync while another sync is already running', async () => {
    let resolveSync: ((value: SyncNowResult) => void) | null = null
    const runManualSync = vi.fn(
      () =>
        new Promise<SyncNowResult>((resolve) => {
          resolveSync = resolve
        }),
    )
    const coordinator = createSyncCoordinator({
      getLocalSyncState: vi.fn(() => createSyncState()),
      runManualSync,
      nowMs: vi.fn(() => 0),
    })

    const manualPromise = coordinator.runManualSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
    })

    const result = await coordinator.maybeAutoSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
      reason: 'window-focus',
    })

    expect(result).toEqual({
      triggered: false,
      reason: 'window-focus',
      skippedReason: 'in_progress',
    })
    expect(runManualSync).toHaveBeenCalledTimes(1)

    resolveSync?.(createSyncResult())
    await manualPromise
  })

  it('applies the auto-sync cooldown between triggers', async () => {
    const nowMs = vi.fn(() => 0)
    const runManualSync = vi.fn(async () => createSyncResult())
    const coordinator = createSyncCoordinator({
      getLocalSyncState: vi.fn(() => createSyncState()),
      runManualSync,
      nowMs,
    })

    const first = await coordinator.maybeAutoSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
      reason: 'startup',
    })

    nowMs.mockReturnValue(AUTO_SYNC_MIN_INTERVAL_MS - 1)

    const second = await coordinator.maybeAutoSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
      reason: 'window-focus',
    })

    expect(first.triggered).toBe(true)
    expect(second).toEqual({
      triggered: false,
      reason: 'window-focus',
      skippedReason: 'cooldown',
    })
    expect(runManualSync).toHaveBeenCalledTimes(1)
  })

  it('runs auto sync again after the cooldown window passes', async () => {
    const nowMs = vi
      .fn<() => number>()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(AUTO_SYNC_MIN_INTERVAL_MS + 1)
    const runManualSync = vi.fn(async () => createSyncResult())
    const coordinator = createSyncCoordinator({
      getLocalSyncState: vi.fn(() => createSyncState()),
      runManualSync,
      nowMs,
    })

    const first = await coordinator.maybeAutoSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
      reason: 'startup',
    })
    const second = await coordinator.maybeAutoSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
      reason: 'window-focus',
    })

    expect(first.triggered).toBe(true)
    expect(second.triggered).toBe(true)
    expect(runManualSync).toHaveBeenCalledTimes(2)
  })

  it('reuses the active sync promise for foreground refresh calls', async () => {
    let resolveSync: ((value: SyncNowResult) => void) | null = null
    const runManualSync = vi.fn(
      () =>
        new Promise<SyncNowResult>((resolve) => {
          resolveSync = resolve
        }),
    )
    const coordinator = createSyncCoordinator({
      getLocalSyncState: vi.fn(() => createSyncState()),
      runManualSync,
      nowMs: vi.fn(() => 0),
    })

    const manualPromise = coordinator.runManualSync({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
    })
    const foregroundPromise = coordinator.refreshForForeground({
      dataPath: '/tmp/j-flow-db',
      appVersion: '0.1.0',
    })

    resolveSync?.(createSyncResult())

    const foregroundResult = await foregroundPromise
    await manualPromise

    expect(runManualSync).toHaveBeenCalledTimes(1)
    expect(foregroundResult).toEqual({
      triggered: true,
      reusedActiveSync: true,
      skippedReason: null,
      result: createSyncResult(),
    })
  })
})

describe('electron/auto-sync registerAutoSyncTriggers', () => {
  it('wires startup delay and window focus into auto sync calls', async () => {
    const window = new EventEmitter() as EventEmitter & {
      on: (event: 'focus', listener: () => void) => EventEmitter
    }
    const invokeAutoSync = vi.fn(async (reason: 'startup' | 'window-focus') => ({
      triggered: false as const,
      reason,
      skippedReason: 'cooldown' as const,
    }))
    const log = vi.fn()
    let scheduledCallback: (() => void) | null = null
    const setTimeoutMock = vi.fn((callback: () => void) => {
      scheduledCallback = callback
      return 1
    })

    registerAutoSyncTriggers(
      window,
      {
        dataPath: '/tmp/j-flow-db',
        appVersion: '0.1.0',
        startupDelayMs: 1234,
      },
      {
        invokeAutoSync,
        log,
        setTimeout: setTimeoutMock,
      },
    )

    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 1234)

    scheduledCallback?.()
    await Promise.resolve()

    window.emit('focus')
    await Promise.resolve()

    expect(invokeAutoSync).toHaveBeenNthCalledWith(1, 'startup')
    expect(invokeAutoSync).toHaveBeenNthCalledWith(2, 'window-focus')
    expect(log).toHaveBeenCalledTimes(2)
  })
})

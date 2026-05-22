import { getSqliteLocalSyncState } from './sqlite.js'
import { runManualSync as runManualSyncCore } from './sync-now.js'
import type { LocalSyncState, SyncNowResult } from './types.js'

export const AUTO_SYNC_MIN_INTERVAL_MS = 30_000
export const AUTO_SYNC_STARTUP_DELAY_MS = 10_000

export type AutoSyncReason = 'startup' | 'window-focus'
export type AutoSyncSkippedReason = 'no_target' | 'in_progress' | 'cooldown'

export type AutoSyncAttemptResult =
  | {
      triggered: true
      reason: AutoSyncReason
      skippedReason: null
      result: SyncNowResult
    }
  | {
      triggered: false
      reason: AutoSyncReason
      skippedReason: AutoSyncSkippedReason
    }

type SyncExecutionInput = {
  dataPath: string
  appVersion: string
}

type SyncCoordinatorDependencies = {
  getLocalSyncState: (dataPath: string) => LocalSyncState
  runManualSync: (input: SyncExecutionInput) => Promise<SyncNowResult>
  nowMs: () => number
}

type AutoSyncTriggerDependencies = {
  invokeAutoSync: (reason: AutoSyncReason) => Promise<AutoSyncAttemptResult>
  log: (message: string, payload?: Record<string, unknown>) => void
  setTimeout: (callback: () => void, delayMs: number) => unknown
}

type AutoSyncTriggerWindow = {
  on: (event: 'focus', listener: () => void) => unknown
}

const defaultDependencies: SyncCoordinatorDependencies = {
  getLocalSyncState: getSqliteLocalSyncState,
  runManualSync: runManualSyncCore,
  nowMs: () => Date.now(),
}

const hasConfiguredSyncTarget = (syncState: LocalSyncState) =>
  Boolean(syncState.syncTargetConfig ?? syncState.syncTargetPath)

export const createSyncCoordinator = (
  dependencies: SyncCoordinatorDependencies = defaultDependencies,
) => {
  let activeSyncPromise: Promise<SyncNowResult> | null = null
  let lastAutoTriggeredAtMs: number | null = null

  const startSharedSync = (input: SyncExecutionInput) => {
    if (activeSyncPromise) {
      return activeSyncPromise
    }

    const syncPromise = dependencies.runManualSync(input).finally(() => {
      if (activeSyncPromise === syncPromise) {
        activeSyncPromise = null
      }
    })

    activeSyncPromise = syncPromise
    return syncPromise
  }

  return {
    isSyncInProgress: () => activeSyncPromise !== null,
    runManualSync: (input: SyncExecutionInput) => startSharedSync(input),
    maybeAutoSync: async (
      input: SyncExecutionInput & {
        reason: AutoSyncReason
      },
    ): Promise<AutoSyncAttemptResult> => {
      const syncState = dependencies.getLocalSyncState(input.dataPath)

      if (!hasConfiguredSyncTarget(syncState)) {
        return {
          triggered: false,
          reason: input.reason,
          skippedReason: 'no_target',
        }
      }

      if (activeSyncPromise) {
        return {
          triggered: false,
          reason: input.reason,
          skippedReason: 'in_progress',
        }
      }

      const nowMs = dependencies.nowMs()

      if (
        lastAutoTriggeredAtMs !== null &&
        nowMs - lastAutoTriggeredAtMs < AUTO_SYNC_MIN_INTERVAL_MS
      ) {
        return {
          triggered: false,
          reason: input.reason,
          skippedReason: 'cooldown',
        }
      }

      lastAutoTriggeredAtMs = nowMs

      return {
        triggered: true,
        reason: input.reason,
        skippedReason: null,
        result: await startSharedSync(input),
      }
    },
  }
}

export const registerAutoSyncTriggers = (
  window: AutoSyncTriggerWindow,
  input: SyncExecutionInput & {
    startupDelayMs?: number
  },
  dependencies: AutoSyncTriggerDependencies,
) => {
  const startupDelayMs = input.startupDelayMs ?? AUTO_SYNC_STARTUP_DELAY_MS

  const fireAutoSync = (reason: AutoSyncReason) => {
    void dependencies
      .invokeAutoSync(reason)
      .then((result) => {
        if (result.triggered) {
          dependencies.log('[J-Flow Desktop] Auto sync finished', {
            reason: result.reason,
            status: result.result.status,
          })
          return
        }

        dependencies.log('[J-Flow Desktop] Auto sync skipped', {
          reason: result.reason,
          skippedReason: result.skippedReason,
        })
      })
      .catch((error: unknown) => {
        dependencies.log('[J-Flow Desktop] Auto sync crashed', {
          reason,
          error: error instanceof Error ? error.message : String(error),
        })
      })
  }

  dependencies.setTimeout(() => {
    fireAutoSync('startup')
  }, startupDelayMs)

  window.on('focus', () => {
    fireAutoSync('window-focus')
  })
}

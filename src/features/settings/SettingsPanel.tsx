import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { appDataRepository } from '@/db'
import {
  COMPLETED_AT_ROUNDING_OPTIONS,
  DEFAULT_COMPLETED_AT_ROUNDING_MINUTES,
} from '@/features/todo/completed-at-rounding'
import type {
  CompletedAtRoundingMinutes,
  LocalSyncResultSummary,
  LocalSyncState,
  SyncNowResult,
  SyncTargetConfig,
  TieBreakerOrder,
} from '@/types'

type SettingsViewState = {
  isLoading: boolean
  tieBreakerOrder: TieBreakerOrder
  completedAtRoundingMinutes: CompletedAtRoundingMinutes
  defaultNightTodoByTimeEnabled: boolean
  defaultNightTodoStartHour: number
  defaultNightTodoEndHour: number
  isDesktop: boolean
  deviceId: string | null
  lastSyncedAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
  lastSyncAttemptedAt: string | null
  lastSyncResult: LocalSyncResultSummary | null
  syncTargetPath: string | null
  syncTargetConfig: SyncTargetConfig | null
  autoBackupCount: number
  latestAutoBackupAt: string | null
}

const initialViewState: SettingsViewState = {
  isLoading: true,
  tieBreakerOrder: 'desc',
  completedAtRoundingMinutes: DEFAULT_COMPLETED_AT_ROUNDING_MINUTES,
  defaultNightTodoByTimeEnabled: false,
  defaultNightTodoStartHour: 17,
  defaultNightTodoEndHour: 23,
  isDesktop: false,
  deviceId: null,
  lastSyncedAt: null,
  lastSyncStatus: null,
  lastSyncError: null,
  lastSyncAttemptedAt: null,
  lastSyncResult: null,
  syncTargetPath: null,
  syncTargetConfig: null,
  autoBackupCount: 0,
  latestAutoBackupAt: null,
}

const TODO_DEFAULT_HOUR_OPTIONS = Array.from({ length: 24 }, (_, value) => value)

const pad = (value: number) => String(value).padStart(2, '0')

const isTutorialMode = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('tutorial') === '1'

const getDesktopApiForSettings = () => {
  if (isTutorialMode()) {
    return null
  }

  return window.jflowDesktop ?? null
}

const tutorialSyncState: LocalSyncState = {
  deviceId: 'tutorial-device',
  lastSyncedAt: '2026-07-02T13:30:00.000Z',
  lastSyncStatus: 'success',
  lastSyncError: null,
  lastSyncAttemptedAt: '2026-07-02T13:30:00.000Z',
  lastSyncResult: {
    status: 'success',
    attemptedAt: '2026-07-02T13:30:00.000Z',
    backupCreated: true,
    backupFilePath: 'J-Flow Sync/backups/tutorial-backup.json',
    importResult: {
      appliedCount: 2,
      skippedCount: 0,
      failedCount: 0,
    },
    exportResult: {
      exportedCount: 5,
      failedCount: 0,
    },
    errors: [],
    warnings: [],
  },
  syncTargetPath: '/J-Flow Sync',
  syncTargetConfig: {
    type: 'localFolder',
    path: '/J-Flow Sync',
  },
}

const buildBackupFilename = () => {
  const now = new Date()
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  return `j-flow-backup-${datePart}-${timePart}.json`
}

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '暂无记录'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const getSyncFolderName = (value: string | null) => {
  if (!value) {
    return '尚未选择'
  }

  const parts = value.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? value
}

const getFirstNonEmptyLine = (value: string | null) => {
  if (!value) {
    return null
  }

  return (
    value
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? null
  )
}

const applySyncStateToViewState = (
  current: SettingsViewState,
  syncState: LocalSyncState | null,
): SettingsViewState => ({
  ...current,
  deviceId: syncState?.deviceId ?? current.deviceId,
  lastSyncedAt: syncState?.lastSyncedAt ?? null,
  lastSyncStatus: syncState?.lastSyncStatus ?? null,
  lastSyncError: syncState?.lastSyncError ?? null,
  lastSyncAttemptedAt: syncState?.lastSyncAttemptedAt ?? null,
  lastSyncResult: syncState?.lastSyncResult ?? null,
  syncTargetPath: syncState?.syncTargetPath ?? null,
  syncTargetConfig: syncState?.syncTargetConfig ?? null,
})

export function SettingsPanel() {
  const navigate = useNavigate()
  const [viewState, setViewState] = useState<SettingsViewState>(initialViewState)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false

    void appDataRepository
      .get()
      .then(async (appData) => {
        if (cancelled) {
          return
        }

        const desktopApi = getDesktopApiForSettings()
        const tutorialMode = isTutorialMode()
        const autoBackupInfo = desktopApi
          ? await desktopApi.getAutoBackupInfo().catch(() => null)
          : tutorialMode
            ? { backupCount: 3, latestBackupAt: '2026-07-02T13:30:00.000Z' }
            : null
        const syncState = desktopApi
          ? await desktopApi.repository.sync.getState().catch(() => null)
          : tutorialMode
            ? tutorialSyncState
            : null

        setViewState({
          isLoading: false,
          tieBreakerOrder: appData.settings.tieBreakerOrder,
          completedAtRoundingMinutes: appData.settings.completedAtRoundingMinutes,
          defaultNightTodoByTimeEnabled: appData.settings.defaultNightTodoByTimeEnabled,
          defaultNightTodoStartHour: appData.settings.defaultNightTodoStartHour,
          defaultNightTodoEndHour: appData.settings.defaultNightTodoEndHour,
          isDesktop: Boolean(desktopApi) || tutorialMode,
          deviceId: syncState?.deviceId ?? null,
          lastSyncedAt: syncState?.lastSyncedAt ?? null,
          lastSyncStatus: syncState?.lastSyncStatus ?? null,
          lastSyncError: syncState?.lastSyncError ?? null,
          lastSyncAttemptedAt: syncState?.lastSyncAttemptedAt ?? null,
          lastSyncResult: syncState?.lastSyncResult ?? null,
          syncTargetPath: syncState?.syncTargetPath ?? null,
          syncTargetConfig: syncState?.syncTargetConfig ?? null,
          autoBackupCount: autoBackupInfo?.backupCount ?? 0,
          latestAutoBackupAt: autoBackupInfo?.latestBackupAt ?? null,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setViewState((current) => ({
          ...current,
          isLoading: false,
        }))
        setErrorMessage(
          error instanceof Error ? error.message : '设置读取失败，请稍后重试。',
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  const withSaving = async (task: () => Promise<void>) => {
    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await task()
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '设置更新失败，请稍后重试。',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const refreshDesktopAutoBackupInfo = async () => {
    const desktopApi = getDesktopApiForSettings()

    if (!desktopApi) {
      return
    }

    const autoBackupInfo = await desktopApi.getAutoBackupInfo().catch(() => null)

    if (!autoBackupInfo) {
      return
    }

    setViewState((current) => ({
      ...current,
      autoBackupCount: autoBackupInfo.backupCount,
      latestAutoBackupAt: autoBackupInfo.latestBackupAt,
    }))
  }

  const refreshDesktopSyncState = async () => {
    const desktopApi = getDesktopApiForSettings()

    if (!desktopApi) {
      return
    }

    const syncState = await desktopApi.repository.sync.getState().catch(() => null)

    if (!syncState) {
      return
    }

    setViewState((current) => applySyncStateToViewState(current, syncState))
  }

  const updateTieBreakerOrder = async (tieBreakerOrder: TieBreakerOrder) => {
    if (tieBreakerOrder === viewState.tieBreakerOrder) {
      return
    }

    await withSaving(async () => {
      await appDataRepository.settings.update({
        tieBreakerOrder,
      })
      setViewState((current) => ({
        ...current,
        tieBreakerOrder,
      }))
      setSuccessMessage(
        `已更新推荐并列排序：${tieBreakerOrder === 'asc' ? '正序' : '倒序'}`,
      )
    })
  }

  const updateCompletedAtRoundingMinutes = async (
    completedAtRoundingMinutes: CompletedAtRoundingMinutes,
  ) => {
    if (completedAtRoundingMinutes === viewState.completedAtRoundingMinutes) {
      return
    }

    await withSaving(async () => {
      await appDataRepository.settings.update({
        completedAtRoundingMinutes,
      })
      setViewState((current) => ({
        ...current,
        completedAtRoundingMinutes,
      }))
      const selectedOption = COMPLETED_AT_ROUNDING_OPTIONS.find(
        (option) => option.value === completedAtRoundingMinutes,
      )
      setSuccessMessage(`已更新完成时间取整：${selectedOption?.label ?? '5 分钟取整'}`)
    })
  }

  const updateDefaultNightTodoSettings = async ({
    defaultNightTodoByTimeEnabled = viewState.defaultNightTodoByTimeEnabled,
    defaultNightTodoStartHour = viewState.defaultNightTodoStartHour,
    defaultNightTodoEndHour = viewState.defaultNightTodoEndHour,
  }: {
    defaultNightTodoByTimeEnabled?: boolean
    defaultNightTodoStartHour?: number
    defaultNightTodoEndHour?: number
  }) => {
    if (
      defaultNightTodoByTimeEnabled === viewState.defaultNightTodoByTimeEnabled &&
      defaultNightTodoStartHour === viewState.defaultNightTodoStartHour &&
      defaultNightTodoEndHour === viewState.defaultNightTodoEndHour
    ) {
      return
    }

    await withSaving(async () => {
      await appDataRepository.settings.update({
        defaultNightTodoByTimeEnabled,
        defaultNightTodoStartHour,
        defaultNightTodoEndHour,
      })
      setViewState((current) => ({
        ...current,
        defaultNightTodoByTimeEnabled,
        defaultNightTodoStartHour,
        defaultNightTodoEndHour,
      }))
      setSuccessMessage('已更新新增 Todo 默认时段。')
    })
  }

  const resetForTesting = async () => {
    const shouldReset = window.confirm(
      '确认重置应用吗？这会清空当前本地数据，并回到第一次打开应用的初始化状态。',
    )

    if (!shouldReset) {
      return
    }

    await withSaving(async () => {
      await appDataRepository.reset()
      navigate('/setup', { replace: true })
    })
  }

  const replayTutorial = () => {
    navigate('/?tutorial=1')
  }

  const exportBackup = async () => {
    await withSaving(async () => {
      const appData = await appDataRepository.exportSnapshot()
      const content = `${JSON.stringify(appData, null, 2)}\n`

      const desktopApi = getDesktopApiForSettings()

      if (desktopApi) {
        const result = await desktopApi.saveJsonBackup({
          suggestedFilename: buildBackupFilename(),
          content,
        })

        if (result.canceled) {
          return
        }

        setSuccessMessage(
          result.filePath ? `已导出当前本地数据：${result.filePath}` : '已导出当前本地数据。',
        )
        return
      }

      const blob = new Blob([content], {
        type: 'application/json',
      })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = objectUrl
      link.download = buildBackupFilename()
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)

      setSuccessMessage('已导出当前本地数据。')
    })
  }

  const importBackupFile = async (file: File) => {
    const confirmed = window.confirm(
      '确认导入这个备份文件吗？导入会覆盖当前本地数据。',
    )

    if (!confirmed) {
      return
    }

    await withSaving(async () => {
      const fileContent = await file.text()
      const parsed = JSON.parse(fileContent) as Parameters<
        typeof appDataRepository.importSnapshot
      >[0]

      const imported = await appDataRepository.importSnapshot(parsed)

      setViewState((current) => ({
        ...current,
        isLoading: false,
        tieBreakerOrder: imported.settings.tieBreakerOrder,
        completedAtRoundingMinutes: imported.settings.completedAtRoundingMinutes,
        defaultNightTodoByTimeEnabled: imported.settings.defaultNightTodoByTimeEnabled,
        defaultNightTodoStartHour: imported.settings.defaultNightTodoStartHour,
        defaultNightTodoEndHour: imported.settings.defaultNightTodoEndHour,
      }))
      await refreshDesktopAutoBackupInfo()
      setSuccessMessage('已导入备份并覆盖当前本地数据。')
    })
  }

  const handleImportInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    await importBackupFile(file)
  }

  const importBackupFromDesktop = async () => {
    const desktopApi = getDesktopApiForSettings()

    if (!desktopApi) {
      return
    }

    const confirmed = window.confirm(
      '确认导入这个备份文件吗？导入会覆盖当前本地数据。',
    )

    if (!confirmed) {
      return
    }

    await withSaving(async () => {
      const result = await desktopApi.readJsonBackup()

      if (result.canceled || !result.content) {
        return
      }

      const parsed = JSON.parse(result.content) as Parameters<
        typeof appDataRepository.importSnapshot
      >[0]
      const imported = await appDataRepository.importSnapshot(parsed)

      setViewState((current) => ({
        ...current,
        isLoading: false,
        tieBreakerOrder: imported.settings.tieBreakerOrder,
        completedAtRoundingMinutes: imported.settings.completedAtRoundingMinutes,
        defaultNightTodoByTimeEnabled: imported.settings.defaultNightTodoByTimeEnabled,
        defaultNightTodoStartHour: imported.settings.defaultNightTodoStartHour,
        defaultNightTodoEndHour: imported.settings.defaultNightTodoEndHour,
      }))
      await refreshDesktopAutoBackupInfo()
      setSuccessMessage(
        result.filePath
          ? `已导入备份并覆盖当前本地数据：${result.filePath}`
          : '已导入备份并覆盖当前本地数据。',
      )
    })
  }

  const restoreLatestAutoBackup = async () => {
    const desktopApi = getDesktopApiForSettings()

    if (!desktopApi) {
      return
    }

    const confirmed = window.confirm('确认恢复最新一份自动备份吗？恢复会覆盖当前本地数据。')

    if (!confirmed) {
      return
    }

    await withSaving(async () => {
      const result = await desktopApi.readLatestAutoBackup()

      if (!result.filePath || !result.content) {
        throw new Error('当前还没有可恢复的自动备份。')
      }

      const parsed = JSON.parse(result.content) as Parameters<
        typeof appDataRepository.importSnapshot
      >[0]
      const imported = await appDataRepository.importSnapshot(parsed)

      setViewState((current) => ({
        ...current,
        isLoading: false,
        tieBreakerOrder: imported.settings.tieBreakerOrder,
        completedAtRoundingMinutes: imported.settings.completedAtRoundingMinutes,
        defaultNightTodoByTimeEnabled: imported.settings.defaultNightTodoByTimeEnabled,
        defaultNightTodoStartHour: imported.settings.defaultNightTodoStartHour,
        defaultNightTodoEndHour: imported.settings.defaultNightTodoEndHour,
      }))
      await refreshDesktopAutoBackupInfo()
      setSuccessMessage('已恢复最新一份自动备份。')
    })
  }

  const localFolderConfigPath =
    viewState.syncTargetConfig?.type === 'localFolder'
      ? viewState.syncTargetConfig.path
      : viewState.syncTargetPath

  const activeSyncTarget = localFolderConfigPath
    ? ({ type: 'localFolder', path: localFolderConfigPath } as const)
    : null

  const activeSyncTargetType = activeSyncTarget?.type ?? null
  const isLocalFolderTargetActive = activeSyncTargetType === 'localFolder'
  const hasConfiguredSyncTarget = activeSyncTarget !== null

  const chooseDesktopSyncDirectory = async () => {
    const desktopApi = getDesktopApiForSettings()

    if (!desktopApi) {
      return
    }

    await withSaving(async () => {
      const selectedPath = await desktopApi.repository.sync.chooseTargetPath()

      if (!selectedPath) {
        return
      }

      const testResult = await desktopApi.repository.sync.testTargetPath(selectedPath)

      if (!testResult.success) {
        throw new Error(testResult.error ?? testResult.message)
      }

      const nextState = await desktopApi.repository.sync.setTargetPath(selectedPath)

      setViewState((current) => applySyncStateToViewState(current, nextState))
      setSuccessMessage(`已连接本地同步文件夹：${getSyncFolderName(selectedPath)}`)
    })
  }

  const testDesktopSyncDirectory = async () => {
    const desktopApi = getDesktopApiForSettings()

    if (!desktopApi) {
      return
    }

    await withSaving(async () => {
      const result = await desktopApi.repository.sync.testTargetPath()

      if (!result.success) {
        throw new Error(result.error ?? result.message)
      }

      setSuccessMessage(result.message)
    })
  }

  const clearDesktopSyncDirectory = async () => {
    const desktopApi = getDesktopApiForSettings()

    if (!desktopApi) {
      return
    }

    const shouldClear = window.confirm('确认清除当前同步文件夹吗？这不会删除文件夹内容，只会移除本机的同步入口。')

    if (!shouldClear) {
      return
    }

    await withSaving(async () => {
      const nextState = await desktopApi.repository.sync.clearTargetPath()

      setViewState((current) => applySyncStateToViewState(current, nextState))
      setSuccessMessage('已清除本地文件夹同步目标。')
    })
  }

  const openDesktopSyncDirectory = async () => {
    const desktopApi = getDesktopApiForSettings()

    if (!desktopApi) {
      return
    }

    await withSaving(async () => {
      const result = await desktopApi.repository.sync.openTargetPath()

      if (!result.success) {
        throw new Error(result.errorMessage ?? '打开同步文件夹失败，请稍后重试。')
      }

      setSuccessMessage(`已打开同步文件夹：${result.path}`)
    })
  }

  const runDesktopManualSync = async () => {
    const desktopApi = getDesktopApiForSettings()

    if (!desktopApi) {
      return
    }

    setIsSyncing(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = (await desktopApi.repository.sync.syncNow()) as SyncNowResult
      await refreshDesktopSyncState()
      await refreshDesktopAutoBackupInfo()

      if (result.status === 'success') {
        setSuccessMessage('同步已完成。')
      } else if (result.status === 'partial') {
        setErrorMessage('同步已完成部分内容，请查看详情。')
      } else {
        throw new Error(result.errors[0] ?? '同步失败，请稍后重试。')
      }
    } catch (error: unknown) {
      await refreshDesktopSyncState()
      setErrorMessage(error instanceof Error ? error.message : '同步失败，请稍后重试。')
    } finally {
      setIsSyncing(false)
    }
  }

  const syncCardStatus = (() => {
    if (!hasConfiguredSyncTarget) {
      return 'not_configured' as const
    }

    if (isSyncing) {
      return 'syncing' as const
    }

    if (viewState.lastSyncStatus === 'success') {
      return 'success' as const
    }

    if (viewState.lastSyncStatus === 'partial') {
      return 'partial' as const
    }

    if (viewState.lastSyncStatus === 'failed') {
      return 'failed' as const
    }

    return 'ready' as const
  })()

  const syncStatusTitle =
    syncCardStatus === 'not_configured'
      ? '未设置同步目标'
      : syncCardStatus === 'syncing'
        ? '正在同步'
        : syncCardStatus === 'success'
          ? '同步成功'
          : syncCardStatus === 'partial'
            ? '部分完成'
            : syncCardStatus === 'failed'
              ? '同步失败'
              : '使用本地文件夹同步'

  const syncStatusDescription =
    syncCardStatus === 'not_configured'
      ? '选择本地文件夹后，即可手动同步。'
      : syncCardStatus === 'syncing'
        ? '正在导入与导出变化…'
      : syncCardStatus === 'success'
        ? `上次同步：${formatDateTime(viewState.lastSyncedAt)}`
        : syncCardStatus === 'partial'
          ? `上次尝试：${formatDateTime(viewState.lastSyncAttemptedAt)}`
          : syncCardStatus === 'failed'
            ? getFirstNonEmptyLine(viewState.lastSyncError) ??
              `上次尝试：${formatDateTime(viewState.lastSyncAttemptedAt)}`
            : viewState.lastSyncedAt
              ? `上次同步：${formatDateTime(viewState.lastSyncedAt)}`
              : '尚未同步'

  const syncResultSummary =
    syncCardStatus === 'syncing'
      ? '正在导入与导出变化…'
      : syncCardStatus === 'success'
        ? `应用 ${viewState.lastSyncResult?.importResult?.appliedCount ?? 0} 条远端变化，导出 ${viewState.lastSyncResult?.exportResult?.exportedCount ?? 0} 条本地变化`
        : syncCardStatus === 'partial'
          ? `已完成部分同步，${(viewState.lastSyncResult?.importResult?.failedCount ?? 0) + (viewState.lastSyncResult?.exportResult?.failedCount ?? 0)} 条失败`
          : syncCardStatus === 'failed'
            ? '本次同步未完成'
            : syncCardStatus === 'ready'
              ? '尚未开始同步'
              : '尚未同步'

  const syncPrimaryActionLabel =
    syncCardStatus === 'syncing'
      ? '同步中…'
      : hasConfiguredSyncTarget
        ? '立即同步'
        : '选择文件夹'

  const syncTargetTypeLabel = isLocalFolderTargetActive ? '本地文件夹' : '未设置'

  const localTargetDisplayName = getSyncFolderName(localFolderConfigPath)

  if (viewState.isLoading) {
    return (
      <div className="page-stack">
        <section className="surface-card surface-card--compact page-panel page-panel--settings">
          <div className="page-stack__header">
            <p className="eyebrow">Settings</p>
            <h2>设置</h2>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="surface-card surface-card--compact page-panel page-panel--settings">
        <div className="page-stack__header">
          <p className="eyebrow">Settings</p>
          <h2>设置</h2>
        </div>
        <div className="page-panel__body page-panel__body--settings">
          {errorMessage ? (
            <p className="form-message form-message--danger">{errorMessage}</p>
          ) : null}

          {successMessage ? (
            <p className="form-message form-message--success">{successMessage}</p>
          ) : null}

          <div className="settings-panel">
            <section className="settings-panel__section settings-panel__section--preferences">
              <div className="settings-panel__section-header">
                <p className="eyebrow">Preferences</p>
                <h3>排序设置</h3>
                <p>当推荐结果兴趣程度相同时，按加入时间的正序或倒序打破并列。</p>
              </div>

              <div className="settings-choice-row">
                <button
                  className={
                    viewState.tieBreakerOrder === 'asc'
                      ? 'check-tile check-tile--selected'
                      : 'check-tile'
                  }
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void updateTieBreakerOrder('asc')
                  }}
                >
                  正序
                </button>
                <button
                  className={
                    viewState.tieBreakerOrder === 'desc'
                      ? 'check-tile check-tile--selected'
                      : 'check-tile'
                  }
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void updateTieBreakerOrder('desc')
                  }}
                >
                  倒序
                </button>
              </div>
            </section>

            <section className="settings-panel__section settings-panel__section--preferences">
              <div className="settings-panel__section-header">
                <p className="eyebrow">Preferences</p>
                <h3>完成时间取整</h3>
                <p>勾选完成时，系统按这里的规则记录完成时间。默认使用 5 分钟取整。</p>
              </div>

              <div className="settings-choice-row settings-choice-row--wide">
                {COMPLETED_AT_ROUNDING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={
                      viewState.completedAtRoundingMinutes === option.value
                        ? 'check-tile check-tile--selected'
                        : 'check-tile'
                    }
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      void updateCompletedAtRoundingMinutes(option.value)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-panel__section settings-panel__section--preferences">
              <div className="settings-panel__section-header">
                <p className="eyebrow">Preferences</p>
                <h3>新增 Todo 默认时段</h3>
                <p>开启后，夜间时段内新增的 Todo 默认放入晚上。</p>
              </div>

              <div className="settings-choice-row">
                <button
                  className={
                    viewState.defaultNightTodoByTimeEnabled
                      ? 'check-tile check-tile--selected'
                      : 'check-tile'
                  }
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void updateDefaultNightTodoSettings({
                      defaultNightTodoByTimeEnabled: true,
                    })
                  }}
                >
                  开启
                </button>
                <button
                  className={
                    !viewState.defaultNightTodoByTimeEnabled
                      ? 'check-tile check-tile--selected'
                      : 'check-tile'
                  }
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void updateDefaultNightTodoSettings({
                      defaultNightTodoByTimeEnabled: false,
                    })
                  }}
                >
                  关闭
                </button>
              </div>

              <div className="settings-hour-window">
                <label className="settings-hour-window__field">
                  <span>开始</span>
                  <select
                    value={viewState.defaultNightTodoStartHour}
                    disabled={isSaving}
                    onChange={(event) => {
                      void updateDefaultNightTodoSettings({
                        defaultNightTodoStartHour: Number(event.target.value),
                      })
                    }}
                  >
                    {TODO_DEFAULT_HOUR_OPTIONS.map((hour) => (
                      <option key={hour} value={hour}>
                        {pad(hour)}:00
                      </option>
                    ))}
                  </select>
                </label>
                <label className="settings-hour-window__field">
                  <span>结束</span>
                  <select
                    value={viewState.defaultNightTodoEndHour}
                    disabled={isSaving}
                    onChange={(event) => {
                      void updateDefaultNightTodoSettings({
                        defaultNightTodoEndHour: Number(event.target.value),
                      })
                    }}
                  >
                    {TODO_DEFAULT_HOUR_OPTIONS.map((hour) => (
                      <option key={hour} value={hour}>
                        {pad(hour)}:00
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

          <section
            className="settings-panel__section settings-panel__section--data"
            data-tutorial-id="settings-data"
          >
            <div className="settings-panel__section-header">
              <p className="eyebrow">Data</p>
              <h3>数据导入 / 导出</h3>
              <p>
                {viewState.isDesktop
                  ? '导入与导出当前本地数据，或用自动备份文件整体覆盖当前本地数据。'
                  : '导出当前本地数据，或用备份文件整体覆盖当前本地数据。'}
              </p>
            </div>

            <input
              ref={importInputRef}
              className="settings-file-input"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void handleImportInputChange(event)
              }}
            />

            <div className="settings-choice-row settings-choice-row--tools">
              <button
                className="check-tile"
                type="button"
                disabled={isSaving}
                onClick={() => {
                  void exportBackup()
                }}
                >
                导出数据
              </button>
              <button
                className="check-tile"
                type="button"
                disabled={isSaving}
                onClick={() => {
                  if (viewState.isDesktop) {
                    void importBackupFromDesktop()
                    return
                  }

                  importInputRef.current?.click()
                }}
              >
                导入数据
              </button>
              {viewState.isDesktop ? (
                <button
                  className="check-tile"
                  type="button"
                  disabled={isSaving || viewState.autoBackupCount === 0}
                  onClick={() => {
                    void restoreLatestAutoBackup()
                  }}
                >
                  恢复备份
                </button>
              ) : null}
            </div>
          </section>

          {viewState.isDesktop ? (
            <section
              className="settings-panel__section settings-panel__section--data"
              data-tutorial-id="settings-sync"
            >
              <div className="settings-panel__section-header">
                <p className="eyebrow">Sync</p>
                <h3>同步</h3>
                <p>通过本地文件夹，在多台桌面设备之间手动同步数据。</p>
              </div>

              <div
                className={`settings-sync-card settings-sync-card--${syncCardStatus.replace('_', '-')}`}
              >
                <div className="settings-sync-card__status">
                  <span
                    className={`settings-sync-card__status-icon settings-sync-card__status-icon--${syncCardStatus.replace('_', '-')}`}
                    aria-hidden="true"
                  />
                  <div className="settings-sync-card__status-copy">
                    <p className="settings-sync-card__status-title">{syncStatusTitle}</p>
                    <p className="settings-sync-card__status-description">
                      {syncStatusDescription}
                    </p>
                  </div>
                </div>

                <div className="settings-sync-card__row">
                  <div className="settings-sync-card__meta">
                    <p className="settings-sync-card__label">同步目标</p>
                    <p className="settings-sync-card__value">{syncTargetTypeLabel}</p>
                  </div>
                </div>

                <div className="settings-sync-card__row">
                  <div className="settings-sync-card__meta">
                    <p className="settings-sync-card__label">本地文件夹</p>
                    <p className="settings-sync-card__value">{localTargetDisplayName}</p>
                    {localFolderConfigPath ? (
                      <p
                        className="settings-sync-card__path"
                        title={localFolderConfigPath}
                      >
                        {localFolderConfigPath}
                      </p>
                    ) : (
                      <p className="settings-sync-card__path">尚未选择</p>
                    )}
                  </div>
                  <div className="settings-sync-card__inline-actions">
                    <button
                      className="ghost-button ghost-button--compact"
                      type="button"
                      disabled={isSaving || isSyncing}
                      onClick={() => {
                        void chooseDesktopSyncDirectory()
                      }}
                    >
                      {isLocalFolderTargetActive ? '更改' : '选择文件夹'}
                    </button>
                    <button
                      className="ghost-button ghost-button--compact"
                      type="button"
                      disabled={isSaving || isSyncing || !isLocalFolderTargetActive}
                      onClick={() => {
                        void openDesktopSyncDirectory()
                      }}
                    >
                      打开
                    </button>
                  </div>
                </div>

                <div className="settings-sync-card__row settings-sync-card__row--result">
                  <div className="settings-sync-card__meta">
                    <p className="settings-sync-card__label">最近结果</p>
                    <p className="settings-sync-card__result">{syncResultSummary}</p>
                  </div>
                </div>

                <div className="settings-sync-card__actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={isSaving || isSyncing}
                    onClick={() => {
                      if (!hasConfiguredSyncTarget) {
                        void chooseDesktopSyncDirectory()
                        return
                      }

                      void runDesktopManualSync()
                    }}
                  >
                    {syncPrimaryActionLabel}
                  </button>
                </div>

                <details className="settings-sync-card__details">
                  <summary className="settings-sync-card__details-summary">查看详情</summary>
                  <div className="settings-sync-card__details-body">
                    <div className="settings-sync-card__details-grid">
                      <div>
                        <p className="settings-sync-card__label">同步目标类型</p>
                        <p className="settings-sync-card__detail-value">{syncTargetTypeLabel}</p>
                      </div>
                      <div>
                        <p className="settings-sync-card__label">上次同步时间</p>
                        <p className="settings-sync-card__detail-value">
                          {formatDateTime(viewState.lastSyncedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="settings-sync-card__label">deviceId</p>
                        <p className="settings-sync-card__detail-value settings-sync-card__detail-value--mono">
                          {viewState.deviceId ?? '暂无记录'}
                        </p>
                      </div>
                      <div>
                        <p className="settings-sync-card__label">syncVersion</p>
                        <p className="settings-sync-card__detail-value">1</p>
                      </div>
                      <div>
                        <p className="settings-sync-card__label">远端导入</p>
                        <p className="settings-sync-card__detail-value">
                          应用 {viewState.lastSyncResult?.importResult?.appliedCount ?? 0}，跳过{' '}
                          {viewState.lastSyncResult?.importResult?.skippedCount ?? 0}，失败{' '}
                          {viewState.lastSyncResult?.importResult?.failedCount ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="settings-sync-card__label">本地导出</p>
                        <p className="settings-sync-card__detail-value">
                          导出 {viewState.lastSyncResult?.exportResult?.exportedCount ?? 0}，失败{' '}
                          {viewState.lastSyncResult?.exportResult?.failedCount ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="settings-sync-card__label">最近一次备份</p>
                        <p
                          className="settings-sync-card__detail-value settings-sync-card__detail-value--mono"
                          title={viewState.lastSyncResult?.backupFilePath ?? '暂无记录'}
                        >
                          {viewState.lastSyncResult?.backupFilePath ?? '暂无记录'}
                        </p>
                      </div>
                      <div>
                        <p className="settings-sync-card__label">同步路径</p>
                        <p
                          className="settings-sync-card__detail-value settings-sync-card__detail-value--mono"
                          title={localFolderConfigPath ?? '暂无记录'}
                        >
                          {localFolderConfigPath ?? '暂无记录'}
                        </p>
                      </div>
                      <div className="settings-sync-card__details-grid-item--wide">
                        <p className="settings-sync-card__label">完整错误信息</p>
                        <p className="settings-sync-card__detail-value settings-sync-card__detail-value--multiline">
                          {viewState.lastSyncResult?.errors.length
                            ? viewState.lastSyncResult.errors.join('\n')
                            : '暂无错误'}
                        </p>
                      </div>
                      <div className="settings-sync-card__details-grid-item--wide">
                        <p className="settings-sync-card__label">最近警告</p>
                        <p className="settings-sync-card__detail-value settings-sync-card__detail-value--multiline">
                          {viewState.lastSyncResult?.warnings.length
                            ? viewState.lastSyncResult.warnings.join('\n')
                            : '暂无警告'}
                        </p>
                      </div>
                    </div>

                    <div className="settings-sync-card__detail-actions">
                      <button
                        className="ghost-button ghost-button--compact"
                        type="button"
                        disabled={isSaving || isSyncing || !isLocalFolderTargetActive}
                        onClick={() => {
                          void testDesktopSyncDirectory()
                        }}
                      >
                        测试同步文件夹
                      </button>
                      <button
                        className="ghost-button ghost-button--compact ghost-button--danger"
                        type="button"
                        disabled={isSaving || isSyncing || !hasConfiguredSyncTarget}
                        onClick={() => {
                          void clearDesktopSyncDirectory()
                        }}
                      >
                        清除同步文件夹
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </section>
          ) : null}

          <section className="settings-panel__section settings-panel__section--guide">
            <div className="settings-panel__section-header">
              <p className="eyebrow">Guide</p>
              <h3>初始化与使用教学</h3>
              <p>
                重置应用后会清空当前本地应用数据，并回到第一次打开应用的初始化流程；也可以在此重看使用教学。
              </p>
            </div>

            <div className="settings-guide-actions">
              <button
                className="ghost-button"
                type="button"
                disabled={isSaving}
                onClick={() => {
                  void resetForTesting()
                }}
              >
                重置应用
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={isSaving}
                onClick={replayTutorial}
              >
                使用教学
              </button>
            </div>
            </section>
            <p className="settings-panel__credit">
              制作：葉汀芷（微博/小红书：@也停止）
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

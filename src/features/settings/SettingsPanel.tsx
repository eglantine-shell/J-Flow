import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { appDataRepository } from '@/db'
import {
  COMPLETED_AT_ROUNDING_OPTIONS,
  DEFAULT_COMPLETED_AT_ROUNDING_MINUTES,
} from '@/features/todo/completed-at-rounding'
import type { CompletedAtRoundingMinutes, TieBreakerOrder } from '@/types'

type SettingsViewState = {
  isLoading: boolean
  tieBreakerOrder: TieBreakerOrder
  completedAtRoundingMinutes: CompletedAtRoundingMinutes
  isDesktop: boolean
  dataPath: string | null
  databasePath: string | null
  autoBackupDirectory: string | null
  autoBackupCount: number
  latestAutoBackupAt: string | null
}

const initialViewState: SettingsViewState = {
  isLoading: true,
  tieBreakerOrder: 'desc',
  completedAtRoundingMinutes: DEFAULT_COMPLETED_AT_ROUNDING_MINUTES,
  isDesktop: false,
  dataPath: null,
  databasePath: null,
  autoBackupDirectory: null,
  autoBackupCount: 0,
  latestAutoBackupAt: null,
}

const pad = (value: number) => String(value).padStart(2, '0')

const buildBackupFilename = () => {
  const now = new Date()
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  return `j-flow-backup-${datePart}-${timePart}.json`
}

const formatBackupTime = (value: string | null) => {
  if (!value) {
    return '暂无自动备份'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function SettingsPanel() {
  const navigate = useNavigate()
  const [viewState, setViewState] = useState<SettingsViewState>(initialViewState)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false

    void appDataRepository
      .get()
      .then(async (appData) => {
        if (cancelled) {
          return
        }

        const storageInfo = window.jflowDesktop
          ? await window.jflowDesktop.getStorageInfo().catch(() => null)
          : null
        const autoBackupInfo = window.jflowDesktop
          ? await window.jflowDesktop.getAutoBackupInfo().catch(() => null)
          : null

        setViewState({
          isLoading: false,
          tieBreakerOrder: appData.settings.tieBreakerOrder,
          completedAtRoundingMinutes: appData.settings.completedAtRoundingMinutes,
          isDesktop: Boolean(window.jflowDesktop),
          dataPath: storageInfo?.dataPath ?? null,
          databasePath: storageInfo?.databasePath ?? null,
          autoBackupDirectory:
            autoBackupInfo?.directory ?? storageInfo?.autoBackupDirectory ?? null,
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
    if (!window.jflowDesktop) {
      return
    }

    const autoBackupInfo = await window.jflowDesktop.getAutoBackupInfo().catch(() => null)

    if (!autoBackupInfo) {
      return
    }

    setViewState((current) => ({
      ...current,
      autoBackupDirectory: autoBackupInfo.directory,
      autoBackupCount: autoBackupInfo.backupCount,
      latestAutoBackupAt: autoBackupInfo.latestBackupAt,
    }))
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

  const exportBackup = async () => {
    await withSaving(async () => {
      const appData = await appDataRepository.exportSnapshot()
      const content = `${JSON.stringify(appData, null, 2)}\n`

      if (window.jflowDesktop) {
        const result = await window.jflowDesktop.saveJsonBackup({
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
    const desktopApi = window.jflowDesktop

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
      }))
      await refreshDesktopAutoBackupInfo()
      setSuccessMessage(
        result.filePath
          ? `已导入备份并覆盖当前本地数据：${result.filePath}`
          : '已导入备份并覆盖当前本地数据。',
      )
    })
  }

  const openDesktopDataDirectory = async () => {
    const desktopApi = window.jflowDesktop

    if (!desktopApi) {
      return
    }

    await withSaving(async () => {
      const result = await desktopApi.openDataDirectory()

      if (!result.success) {
        throw new Error(result.errorMessage ?? '打开数据目录失败，请稍后重试。')
      }

      setSuccessMessage(`已打开数据目录：${result.path}`)
    })
  }

  const createDesktopAutoBackup = async () => {
    const desktopApi = window.jflowDesktop

    if (!desktopApi) {
      return
    }

    await withSaving(async () => {
      const result = await desktopApi.createAutoBackup()

      setViewState((current) => ({
        ...current,
        autoBackupDirectory: result.backupInfo.directory,
        autoBackupCount: result.backupInfo.backupCount,
        latestAutoBackupAt: result.backupInfo.latestBackupAt,
      }))
      setSuccessMessage(
        result.created && result.filePath
          ? `已创建自动备份：${result.filePath}`
          : '当前没有可备份的数据，或今日启动备份已存在。',
      )
    })
  }

  const openDesktopBackupDirectory = async () => {
    const desktopApi = window.jflowDesktop

    if (!desktopApi) {
      return
    }

    await withSaving(async () => {
      const result = await desktopApi.openBackupDirectory()

      if (!result.success) {
        throw new Error(result.errorMessage ?? '打开自动备份目录失败，请稍后重试。')
      }

      setSuccessMessage(`已打开自动备份目录：${result.path}`)
    })
  }

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

          <section className="settings-panel__section settings-panel__section--data">
            <div className="settings-panel__section-header">
              <p className="eyebrow">Data</p>
              <h3>数据导入 / 导出</h3>
              <p>
                {viewState.isDesktop
                  ? '桌面环境下使用系统文件对话框导入 / 导出 JSON 备份；Web 环境仍保留浏览器下载 / 上传回退。'
                  : '导出当前本地数据，或用备份文件整体覆盖当前本地数据。'}
              </p>
            </div>

            {viewState.isDesktop ? (
              <div className="settings-data-path-card">
                <p className="settings-data-path-card__label">当前桌面数据目录</p>
                <code className="settings-data-path-card__value">
                  {viewState.dataPath ?? '读取中...'}
                </code>
                <p className="settings-data-path-card__label">当前 SQLite 主库文件</p>
                <code className="settings-data-path-card__value">
                  {viewState.databasePath ?? '读取中...'}
                </code>
                <p className="settings-data-path-card__hint">
                  当前桌面运行时主库由 Electron main 持有，主库文件固定保存在这个数据目录里。
                </p>
                <p className="settings-data-path-card__hint">
                  自动备份目录位于 `backups/`；手动导入 / 导出默认从这个目录起步，但导出的 JSON 会保存到你在系统对话框里选择的位置。
                </p>
              </div>
            ) : (
              <input
                ref={importInputRef}
                className="settings-file-input"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  void handleImportInputChange(event)
                }}
              />
            )}

            <div className="settings-choice-row settings-choice-row--tools">
              <button
                className="check-tile"
                type="button"
                disabled={isSaving}
                onClick={() => {
                  void exportBackup()
                }}
              >
                导出当前数据
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
                导入备份文件
              </button>
              {viewState.isDesktop ? (
                <button
                  className="check-tile"
                  type="button"
                  disabled={isSaving || !viewState.dataPath}
                  onClick={() => {
                    void openDesktopDataDirectory()
                  }}
                >
                  打开数据目录
                </button>
              ) : null}
            </div>
          </section>

          {viewState.isDesktop ? (
            <section className="settings-panel__section settings-panel__section--backup">
              <div className="settings-panel__section-header">
                <p className="eyebrow">Backup</p>
                <h3>自动备份</h3>
                <p>
                  桌面版默认启用自动备份，备份文件保存在数据目录下的
                  `backups/` 中，当前最多保留最近 20 份自动备份。
                </p>
              </div>

              <div className="settings-data-path-card">
                <p className="settings-data-path-card__label">自动备份目录</p>
                <code className="settings-data-path-card__value">
                  {viewState.autoBackupDirectory ?? '读取中...'}
                </code>
                <p className="settings-data-path-card__hint">
                  最近一次自动备份：{formatBackupTime(viewState.latestAutoBackupAt)}
                </p>
                <p className="settings-data-path-card__hint">
                  当前自动备份数量：{viewState.autoBackupCount}
                </p>
              </div>

              <div className="settings-choice-row settings-choice-row--tools">
                <button
                  className="check-tile"
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void createDesktopAutoBackup()
                  }}
                >
                  立即创建备份
                </button>
                <button
                  className="check-tile"
                  type="button"
                  disabled={isSaving || !viewState.autoBackupDirectory}
                  onClick={() => {
                    void openDesktopBackupDirectory()
                  }}
                >
                  打开备份目录
                </button>
              </div>
            </section>
          ) : null}

          <section className="settings-panel__section settings-panel__section--danger">
            <div className="settings-panel__section-header">
              <p className="eyebrow">Reset</p>
              <h3>重置应用</h3>
            </div>

            <div className="settings-danger-zone">
              <p className="form-message">
                重置后会清空当前本地应用数据，并回到第一次打开应用的初始化流程。
              </p>
              <div className="setup-actions">
                <button
                  className="ghost-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void resetForTesting()
                  }}
                >
                  重置
                </button>
              </div>
            </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}

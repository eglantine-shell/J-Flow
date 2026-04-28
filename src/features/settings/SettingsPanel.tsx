import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { appDataRepository } from '@/db'
import type { TieBreakerOrder } from '@/types'

type SettingsViewState = {
  isLoading: boolean
  tieBreakerOrder: TieBreakerOrder
}

const initialViewState: SettingsViewState = {
  isLoading: true,
  tieBreakerOrder: 'desc',
}

const pad = (value: number) => String(value).padStart(2, '0')

const buildBackupFilename = () => {
  const now = new Date()
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  return `j-flow-backup-${datePart}-${timePart}.json`
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
      .then((appData) => {
        if (cancelled) {
          return
        }

        setViewState({
          isLoading: false,
          tieBreakerOrder: appData.settings.tieBreakerOrder,
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

  const resetForTesting = async () => {
    const shouldReset = window.confirm(
      '确认重置应用（测试用）吗？这会清空当前本地数据，并回到第一次打开应用的初始化状态。',
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
      const blob = new Blob([`${JSON.stringify(appData, null, 2)}\n`], {
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

      setViewState({
        isLoading: false,
        tieBreakerOrder: imported.settings.tieBreakerOrder,
      })
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

  if (viewState.isLoading) {
    return (
      <section className="page-grid page-grid--single">
        <SurfaceCard title="正在加载设置" description="正在读取本地设置。" />
      </section>
    )
  }

  return (
    <section className="page-grid page-grid--single">
      <SurfaceCard title="设置" description="整理排序设置与测试阶段工具。">
        {errorMessage ? (
          <p className="form-message form-message--danger">{errorMessage}</p>
        ) : null}

        {successMessage ? (
          <p className="form-message form-message--success">{successMessage}</p>
        ) : null}

        <div className="settings-panel">
          <section className="settings-panel__section">
            <div className="settings-panel__section-header">
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

          <section className="settings-panel__section">
            <div className="settings-panel__section-header">
              <h3>数据导入 / 导出</h3>
              <p>导出当前本地数据，或用备份文件整体覆盖当前本地数据。</p>
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

            <div className="settings-choice-row">
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
                  importInputRef.current?.click()
                }}
              >
                导入备份文件
              </button>
            </div>
          </section>

          <section className="settings-panel__section">
            <div className="settings-panel__section-header">
              <h3>测试工具</h3>
              <p>仅供当前开发 / 测试阶段使用。</p>
            </div>

            <div className="settings-danger-zone">
              <p className="form-message">
                重置后会清空当前本地应用数据，并回到第一次打开应用的初始化流程。
              </p>
              <div className="setup-actions">
                <button
                  className="ghost-button ghost-button--danger"
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void resetForTesting()
                  }}
                >
                  重置应用（测试用）
                </button>
              </div>
            </div>
          </section>
        </div>
      </SurfaceCard>
    </section>
  )
}

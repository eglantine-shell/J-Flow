import { useEffect, useState } from 'react'
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

export function SettingsPanel() {
  const navigate = useNavigate()
  const [viewState, setViewState] = useState<SettingsViewState>(initialViewState)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
        <div className="settings-toolbar">
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              navigate('/', { replace: true })
            }}
          >
            返回主页
          </button>
        </div>

        {errorMessage ? (
          <p className="form-message form-message--danger">{errorMessage}</p>
        ) : null}

        {successMessage ? (
          <p className="form-message form-message--success">{successMessage}</p>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        title="排序设置"
        description="当推荐结果兴趣程度相同时，按加入时间的正序或倒序打破并列。"
      >
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
      </SurfaceCard>

      <SurfaceCard
        title="测试工具"
        description="仅供当前开发 / 测试阶段使用。"
      >
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
      </SurfaceCard>
    </section>
  )
}

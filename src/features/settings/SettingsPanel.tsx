import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { appDataRepository } from '@/db'
import type { ActivityType, SceneTag, TieBreakerOrder } from '@/types'

type SettingsViewState = {
  isLoading: boolean
  sceneTags: SceneTag[]
  activityTypes: ActivityType[]
  tieBreakerOrder: TieBreakerOrder
}

const initialViewState: SettingsViewState = {
  isLoading: true,
  sceneTags: [],
  activityTypes: [],
  tieBreakerOrder: 'desc',
}

export function SettingsPanel() {
  const navigate = useNavigate()
  const [viewState, setViewState] = useState<SettingsViewState>(initialViewState)
  const [sceneTagDraft, setSceneTagDraft] = useState('')
  const [activityTypeDraft, setActivityTypeDraft] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadSettings = async () => {
    const appData = await appDataRepository.get()

    setViewState({
      isLoading: false,
      sceneTags: appData.sceneTags,
      activityTypes: appData.activityTypes,
      tieBreakerOrder: appData.settings.tieBreakerOrder,
    })
  }

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
          sceneTags: appData.sceneTags,
          activityTypes: appData.activityTypes,
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

  const sceneTagCountLabel = useMemo(
    () => `${viewState.sceneTags.length} 个时间场景`,
    [viewState.sceneTags.length],
  )
  const activityTypeCountLabel = useMemo(
    () => `${viewState.activityTypes.length} 个活动类型`,
    [viewState.activityTypes.length],
  )

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

  const addSceneTag = async () => {
    const name = sceneTagDraft.trim()

    if (!name) {
      setErrorMessage('请输入时间场景名称。')
      setSuccessMessage(null)
      return
    }

    await withSaving(async () => {
      const created = await appDataRepository.sceneTags.create({
        name,
        isBuiltIn: false,
      })

      setViewState((current) => ({
        ...current,
        sceneTags: [...current.sceneTags, created],
      }))
      setSceneTagDraft('')
      setSuccessMessage(`已新增时间场景：${created.name}`)
    })
  }

  const deleteSceneTag = async (sceneTag: SceneTag) => {
    const shouldDelete = window.confirm('将从所有条目中移除此标签，不删除条目本身。')

    if (!shouldDelete) {
      return
    }

    await withSaving(async () => {
      await appDataRepository.sceneTags.deleteAndDetachTemplates(sceneTag.id)
      setViewState((current) => ({
        ...current,
        sceneTags: current.sceneTags.filter((item) => item.id !== sceneTag.id),
      }))
      setSuccessMessage(`已删除时间场景：${sceneTag.name}`)
    })
  }

  const addActivityType = async () => {
    const name = activityTypeDraft.trim()

    if (!name) {
      setErrorMessage('请输入活动类型名称。')
      setSuccessMessage(null)
      return
    }

    await withSaving(async () => {
      const created = await appDataRepository.activityTypes.create({
        name,
        isBuiltIn: false,
      })

      setViewState((current) => ({
        ...current,
        activityTypes: [...current.activityTypes, created],
      }))
      setActivityTypeDraft('')
      setSuccessMessage(`已新增活动类型：${created.name}`)
    })
  }

  const deleteActivityType = async (activityType: ActivityType) => {
    await withSaving(async () => {
      const result = await appDataRepository.activityTypes.deleteIfUnused(activityType.id)

      if (!result.removed) {
        if (result.reason === 'in_use') {
          setErrorMessage('该活动类型仍被使用，需先修改或删除相关条目后再删除。')
          return
        }

        throw new Error('活动类型删除失败，请稍后重试。')
      }

      setViewState((current) => ({
        ...current,
        activityTypes: current.activityTypes.filter((item) => item.id !== activityType.id),
      }))
      setSuccessMessage(`已删除活动类型：${activityType.name}`)
    })
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
        <SurfaceCard title="正在加载设置" description="正在读取本地设置与管理项。" />
      </section>
    )
  }

  return (
    <section className="page-grid page-grid--single">
      <SurfaceCard title="设置" description="整理基础分类、排序设置与测试阶段工具。">
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

        <div className="setup-summary">
          <div className="setup-summary__item">
            <span className="eyebrow">时间场景</span>
            <strong>{viewState.sceneTags.length}</strong>
            <span>{sceneTagCountLabel}</span>
          </div>
          <div className="setup-summary__item">
            <span className="eyebrow">活动类型</span>
            <strong>{viewState.activityTypes.length}</strong>
            <span>{activityTypeCountLabel}</span>
          </div>
        </div>

        {errorMessage ? (
          <p className="form-message form-message--danger">{errorMessage}</p>
        ) : null}

        {successMessage ? (
          <p className="form-message form-message--success">{successMessage}</p>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        title="时间场景"
        description="允许新增与删除；删除时会从所有模板中移除此标签，但不会删除条目本身。"
      >
        <div className="editor-stack">
          {viewState.sceneTags.map((sceneTag) => (
            <div className="editor-row" key={sceneTag.id}>
              <div className="editor-field">
                <span>{sceneTag.isBuiltIn ? '内置时间场景' : '自定义时间场景'}</span>
                <input value={sceneTag.name} readOnly />
              </div>
              <button
                className="ghost-button"
                type="button"
                disabled={isSaving}
                onClick={() => {
                  void deleteSceneTag(sceneTag)
                }}
              >
                删除
              </button>
            </div>
          ))}

          <div className="editor-row">
            <label className="editor-field">
              <span>新增时间场景</span>
              <input
                value={sceneTagDraft}
                onChange={(event) => {
                  setSceneTagDraft(event.target.value)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void addSceneTag()
                  }
                }}
                placeholder="例如：假期、夜间、外出"
              />
            </label>
            <button
              className="primary-button"
              type="button"
              disabled={isSaving}
              onClick={() => {
                void addSceneTag()
              }}
            >
              新增
            </button>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="活动类型"
        description="允许新增与删除；若仍有模板正在使用该活动类型，则不可删除。"
      >
        <div className="editor-stack">
          {viewState.activityTypes.map((activityType) => (
            <div className="editor-row" key={activityType.id}>
              <div className="editor-field">
                <span>{activityType.isBuiltIn ? '内置活动类型' : '自定义活动类型'}</span>
                <input value={activityType.name} readOnly />
              </div>
              <button
                className="ghost-button"
                type="button"
                disabled={isSaving}
                onClick={() => {
                  void deleteActivityType(activityType)
                }}
              >
                删除
              </button>
            </div>
          ))}

          <div className="editor-row">
            <label className="editor-field">
              <span>新增活动类型</span>
              <input
                value={activityTypeDraft}
                onChange={(event) => {
                  setActivityTypeDraft(event.target.value)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void addActivityType()
                  }
                }}
                placeholder="例如：学习、运动、工作"
              />
            </label>
            <button
              className="primary-button"
              type="button"
              disabled={isSaving}
              onClick={() => {
                void addActivityType()
              }}
            >
              新增
            </button>
          </div>
        </div>
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

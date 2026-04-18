import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { getAppData, replaceAppData } from '@/db'
import type { ActivityType, AppData, SceneTag } from '@/types'

type EditableOption = {
  id: string
  name: string
  createdAt: string
  isBuiltIn: boolean
}

type DraftState = {
  appData: AppData
  sceneTags: EditableOption[]
  activityTypes: EditableOption[]
}

const createDraftId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

const nowIso = () => new Date().toISOString()

const trimOptions = (items: EditableOption[]) =>
  items.map((item) => ({
    ...item,
    name: item.name.trim(),
  }))

const hasBlankName = (items: EditableOption[]) =>
  items.some((item) => item.name.trim().length === 0)

const toSceneTags = (items: EditableOption[]): SceneTag[] => trimOptions(items)

const toActivityTypes = (items: EditableOption[]): ActivityType[] => trimOptions(items)

export function SetupPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void getAppData()
      .then((appData) => {
        if (cancelled) {
          return
        }

        setDraft({
          appData,
          sceneTags: appData.sceneTags.map((item) => ({ ...item })),
          activityTypes: appData.activityTypes.map((item) => ({ ...item })),
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error ? error.message : '初始化数据读取失败。',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const sceneTagCount = draft?.sceneTags.length ?? 0
  const activityTypeCount = draft?.activityTypes.length ?? 0

  const validationMessage = !draft
    ? null
    : sceneTagCount < 1
      ? '至少保留一个时间场景后才能完成初始化。'
      : activityTypeCount < 1
        ? '至少保留一个活动类型后才能完成初始化。'
        : hasBlankName(draft.sceneTags) || hasBlankName(draft.activityTypes)
          ? '时间场景和活动类型名称不能为空。'
          : null

  const updateSceneTag = (id: string, name: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            sceneTags: current.sceneTags.map((item) =>
              item.id === id ? { ...item, name } : item,
            ),
          }
        : current,
    )
  }

  const updateActivityType = (id: string, name: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            activityTypes: current.activityTypes.map((item) =>
              item.id === id ? { ...item, name } : item,
            ),
          }
        : current,
    )
  }

  const addSceneTag = () => {
    setDraft((current) =>
      current
        ? {
            ...current,
            sceneTags: [
              ...current.sceneTags,
              {
                id: createDraftId('scene'),
                name: '',
                createdAt: nowIso(),
                isBuiltIn: false,
              },
            ],
          }
        : current,
    )
  }

  const addActivityType = () => {
    setDraft((current) =>
      current
        ? {
            ...current,
            activityTypes: [
              ...current.activityTypes,
              {
                id: createDraftId('activity'),
                name: '',
                createdAt: nowIso(),
                isBuiltIn: false,
              },
            ],
          }
        : current,
    )
  }

  const removeSceneTag = (id: string) => {
    setDraft((current) => {
      if (!current || current.sceneTags.length <= 1) {
        return current
      }

      return {
        ...current,
        sceneTags: current.sceneTags.filter((item) => item.id !== id),
      }
    })
  }

  const removeActivityType = (id: string) => {
    setDraft((current) => {
      if (!current || current.activityTypes.length <= 1) {
        return current
      }

      return {
        ...current,
        activityTypes: current.activityTypes.filter((item) => item.id !== id),
      }
    })
  }

  const completeSetup = async () => {
    if (!draft || validationMessage) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const timestamp = nowIso()

      await replaceAppData({
        ...draft.appData,
        sceneTags: toSceneTags(draft.sceneTags),
        activityTypes: toActivityTypes(draft.activityTypes),
        settings: {
          ...draft.appData.settings,
          initialized: true,
          updatedAt: timestamp,
        },
      })

      navigate('/', { replace: true })
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '初始化保存失败，请稍后重试。',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="page-grid page-grid--single">
        <SurfaceCard
          title="正在准备初始化"
          description="正在加载默认时间场景与活动类型。"
        />
      </section>
    )
  }

  if (!draft) {
    return (
      <section className="page-grid page-grid--single">
        <SurfaceCard
          title="初始化数据不可用"
          description={errorMessage ?? '当前无法读取初始化数据。'}
        />
      </section>
    )
  }

  return (
    <section className="page-grid setup-grid">
      <SurfaceCard
        title="首次初始化"
        description="先建立你的基础使用框架。当前只处理时间场景、活动类型与完成初始化，不接入条目录入或当天计划。"
      >
        <div className="setup-summary">
          <div className="setup-summary__item">
            <span className="eyebrow">时间场景</span>
            <strong>{sceneTagCount}</strong>
          </div>
          <div className="setup-summary__item">
            <span className="eyebrow">活动类型</span>
            <strong>{activityTypeCount}</strong>
          </div>
        </div>

        {validationMessage ? (
          <p className="form-message form-message--warning">{validationMessage}</p>
        ) : (
          <p className="form-message">校验通过后，点击“完成初始化”才会写入已初始化状态。</p>
        )}

        {errorMessage ? (
          <p className="form-message form-message--danger">{errorMessage}</p>
        ) : null}

        <div className="setup-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              void completeSetup()
            }}
            disabled={Boolean(validationMessage) || isSaving}
          >
            {isSaving ? '保存中...' : '完成初始化'}
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="时间场景"
        description="系统先给出默认值，你可以在初始化阶段调整，但至少保留一个。"
      >
        <div className="editor-stack">
          {draft.sceneTags.map((item, index) => (
            <div className="editor-row" key={item.id}>
              <label className="editor-field">
                <span>时间场景 {index + 1}</span>
                <input
                  value={item.name}
                  onChange={(event) => {
                    updateSceneTag(item.id, event.target.value)
                  }}
                  placeholder="例如：周末、白天、晚上"
                />
              </label>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  removeSceneTag(item.id)
                }}
                disabled={draft.sceneTags.length <= 1}
              >
                删除
              </button>
            </div>
          ))}
        </div>

        <div className="setup-actions">
          <button className="ghost-button" type="button" onClick={addSceneTag}>
            新增时间场景
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="活动类型"
        description="初始化阶段只管理基础活动分类，后续条目录入与使用规则留给后续任务实现。"
      >
        <div className="editor-stack">
          {draft.activityTypes.map((item, index) => (
            <div className="editor-row" key={item.id}>
              <label className="editor-field">
                <span>活动类型 {index + 1}</span>
                <input
                  value={item.name}
                  onChange={(event) => {
                    updateActivityType(item.id, event.target.value)
                  }}
                  placeholder="例如：阅读、学习、家务"
                />
              </label>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  removeActivityType(item.id)
                }}
                disabled={draft.activityTypes.length <= 1}
              >
                删除
              </button>
            </div>
          ))}
        </div>

        <div className="setup-actions">
          <button className="ghost-button" type="button" onClick={addActivityType}>
            新增活动类型
          </button>
        </div>
      </SurfaceCard>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CheckIcon, CloseIcon, PlusIcon } from '@/components/ui/Icons'
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
  const [sceneTagDraft, setSceneTagDraft] = useState('')
  const [activityTypeDraft, setActivityTypeDraft] = useState('')
  const [showSceneTagCreator, setShowSceneTagCreator] = useState(false)
  const [showActivityTypeCreator, setShowActivityTypeCreator] = useState(false)

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
      ? '至少保留一个“有空就做”场景后才能完成初始化。'
      : activityTypeCount < 1
        ? '至少保留一个“种草清单”分类后才能完成初始化。'
        : hasBlankName(draft.sceneTags) || hasBlankName(draft.activityTypes)
          ? '“种草清单”和“有空就做”的名称不能为空。'
          : null

  const addSceneTag = () => {
    const name = sceneTagDraft.trim()

    if (!name) {
      return
    }

    setDraft((current) =>
      current
        ? {
            ...current,
            sceneTags: [
              ...current.sceneTags,
              {
                id: createDraftId('scene'),
                name,
                createdAt: nowIso(),
                isBuiltIn: false,
              },
            ],
          }
        : current,
    )

    setSceneTagDraft('')
    setShowSceneTagCreator(false)
  }

  const addActivityType = () => {
    const name = activityTypeDraft.trim()

    if (!name) {
      return
    }

    setDraft((current) =>
      current
        ? {
            ...current,
            activityTypes: [
              ...current.activityTypes,
              {
                id: createDraftId('activity'),
                name,
                createdAt: nowIso(),
                isBuiltIn: false,
              },
            ],
          }
        : current,
    )

    setActivityTypeDraft('')
    setShowActivityTypeCreator(false)
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
          description="正在加载默认种草清单和有空就做场景。"
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
    <section className="page-grid page-grid--single">
      <SurfaceCard title="哪怕你是一个100%的J人，想必也会有……">
        <div className="setup-tag-section">
          <div className="setup-tag-section__header">
            <h2>种草清单</h2>
            <p>比如，书单、影单、探店清单、逛公园清单，甚至……待处理的家务死角清单？</p>
          </div>

          <div className="tag-chip-grid" aria-label="初始化种草清单">
            {draft.activityTypes.map((item) => (
              <div className="tag-chip" key={item.id}>
                <span className="tag-chip__label">{item.name}</span>
                <span className="tag-chip__divider" aria-hidden="true" />
                <button
                  className="tag-chip__action"
                  type="button"
                  onClick={() => {
                    removeActivityType(item.id)
                  }}
                  disabled={draft.activityTypes.length <= 1}
                  aria-label={`删除种草清单 ${item.name}`}
                >
                  <CloseIcon className="tag-chip__icon" />
                </button>
              </div>
            ))}

            {showActivityTypeCreator ? (
              <div className="tag-chip tag-chip--creator">
                <input
                  className="tag-chip__input"
                  value={activityTypeDraft}
                  onChange={(event) => {
                    setActivityTypeDraft(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addActivityType()
                    }
                  }}
                  placeholder="新增"
                  aria-label="新增种草清单"
                  autoFocus
                />
                <span className="tag-chip__divider" aria-hidden="true" />
                <button
                  className="tag-chip__action tag-chip__action--confirm"
                  type="button"
                  onClick={addActivityType}
                  aria-label="保存种草清单"
                >
                  <CheckIcon className="tag-chip__icon" />
                </button>
              </div>
            ) : (
              <button
                className="tag-chip tag-chip--create"
                type="button"
                onClick={() => {
                  setShowActivityTypeCreator(true)
                }}
                aria-label="新增种草清单"
              >
                <span className="tag-chip__label tag-chip__label--icon">
                  <PlusIcon className="tag-chip__icon" />
                </span>
                <span className="tag-chip__divider" aria-hidden="true" />
                <span className="tag-chip__action tag-chip__action--ghost" aria-hidden="true">
                  <CheckIcon className="tag-chip__icon" />
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="setup-tag-section">
          <div className="setup-tag-section__header">
            <h2>有空就做</h2>
            <p>当你将某些事定义为“有空就做”的事，期待的是怎样的“有空”？</p>
          </div>

          <div className="tag-chip-grid" aria-label="初始化有空就做">
            {draft.sceneTags.map((item) => (
              <div className="tag-chip" key={item.id}>
                <span className="tag-chip__label">{item.name}</span>
                <span className="tag-chip__divider" aria-hidden="true" />
                <button
                  className="tag-chip__action"
                  type="button"
                  onClick={() => {
                    removeSceneTag(item.id)
                  }}
                  disabled={draft.sceneTags.length <= 1}
                  aria-label={`删除有空就做 ${item.name}`}
                >
                  <CloseIcon className="tag-chip__icon" />
                </button>
              </div>
            ))}

            {showSceneTagCreator ? (
              <div className="tag-chip tag-chip--creator">
                <input
                  className="tag-chip__input"
                  value={sceneTagDraft}
                  onChange={(event) => {
                    setSceneTagDraft(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addSceneTag()
                    }
                  }}
                  placeholder="新增"
                  aria-label="新增有空就做"
                  autoFocus
                />
                <span className="tag-chip__divider" aria-hidden="true" />
                <button
                  className="tag-chip__action tag-chip__action--confirm"
                  type="button"
                  onClick={addSceneTag}
                  aria-label="保存有空就做"
                >
                  <CheckIcon className="tag-chip__icon" />
                </button>
              </div>
            ) : (
              <button
                className="tag-chip tag-chip--create"
                type="button"
                onClick={() => {
                  setShowSceneTagCreator(true)
                }}
                aria-label="新增有空就做"
              >
                <span className="tag-chip__label tag-chip__label--icon">
                  <PlusIcon className="tag-chip__icon" />
                </span>
                <span className="tag-chip__divider" aria-hidden="true" />
                <span className="tag-chip__action tag-chip__action--ghost" aria-hidden="true">
                  <CheckIcon className="tag-chip__icon" />
                </span>
              </button>
            )}
          </div>
        </div>

        {validationMessage ? (
          <p className="form-message form-message--warning">{validationMessage}</p>
        ) : null}

        {errorMessage ? (
          <p className="form-message form-message--danger">{errorMessage}</p>
        ) : null}

        <div className="setup-footer">
          <button
            className="primary-button primary-button--arrow"
            type="button"
            onClick={() => {
              void completeSetup()
            }}
            disabled={Boolean(validationMessage) || isSaving}
            aria-label="完成初始化"
          >
            {isSaving ? '…' : '→'}
          </button>
        </div>
      </SurfaceCard>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'

import { CloseIcon } from '@/components/ui/Icons'
import { appDataRepository } from '@/db'
import type { TaskTemplateFormLoadState } from '@/features/templates/TemplateFormFields'
import type { InterestLevel, TaskTemplate } from '@/types'

const INTEREST_LEVEL_MIN = 1
const INTEREST_LEVEL_MAX = 3

const clampInterestLevel = (value: number): InterestLevel =>
  Math.min(INTEREST_LEVEL_MAX, Math.max(INTEREST_LEVEL_MIN, value)) as InterestLevel

export function TemplateManagerPanel() {
  const [loadState, setLoadState] = useState<TaskTemplateFormLoadState>({
    sceneTags: [],
    activityTypes: [],
  })
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState('')
  const [selectedSceneTagIds, setSelectedSceneTagIds] = useState<string[]>([])
  const [pendingInterestTemplateId, setPendingInterestTemplateId] = useState<string | null>(null)
  const [pendingArchiveTemplateId, setPendingArchiveTemplateId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadTemplates = async () => {
    const [sceneTags, activityTypes, allTemplates] = await Promise.all([
      appDataRepository.sceneTags.list(),
      appDataRepository.activityTypes.list(),
      appDataRepository.taskTemplates.list(),
    ])

    setLoadState({
      sceneTags,
      activityTypes,
    })

    setTemplates(
      allTemplates
        .filter(
          (template) => template.templateKind === 'grass' && template.grassStatus === 'active',
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    )

    setSelectedActivityTypeId((current) =>
      current || activityTypes[0]?.id || '',
    )
  }

  useEffect(() => {
    let cancelled = false

    void loadTemplates()
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : '种草列表读取失败，请稍后重试。',
          )
        }
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

  useEffect(() => {
    if (
      selectedActivityTypeId &&
      loadState.activityTypes.some((activityType) => activityType.id === selectedActivityTypeId)
    ) {
      return
    }

    setSelectedActivityTypeId(loadState.activityTypes[0]?.id || '')
  }, [loadState.activityTypes, selectedActivityTypeId])

  const filteredTemplates = useMemo(() => {
    if (!selectedActivityTypeId) {
      return templates
    }

    return templates.filter((template) => {
      if (template.activityTypeId !== selectedActivityTypeId) {
        return false
      }

      if (selectedSceneTagIds.length === 0) {
        return true
      }

      return template.sceneTagIds.some((sceneTagId) => selectedSceneTagIds.includes(sceneTagId))
    })
  }, [selectedActivityTypeId, selectedSceneTagIds, templates])

  const toggleSceneTag = (sceneTagId: string) => {
    setSelectedSceneTagIds((current) =>
      current.includes(sceneTagId)
        ? current.filter((id) => id !== sceneTagId)
        : [...current, sceneTagId],
    )
  }

  const updateInterestLevel = async (template: TaskTemplate, nextInterestLevel: number) => {
    const nextValue = clampInterestLevel(nextInterestLevel)

    if (nextValue === template.interestLevel) {
      return
    }

    setPendingInterestTemplateId(template.id)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const updated = await appDataRepository.taskTemplates.update({
        id: template.id,
        interestLevel: nextValue,
      })

      setTemplates((current) =>
        current.map((item) => (item.id === template.id ? updated : item)),
      )
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '兴趣程度更新失败，请稍后重试。',
      )
    } finally {
      setPendingInterestTemplateId(null)
    }
  }

  const archiveTemplate = async (template: TaskTemplate) => {
    const shouldArchive = window.confirm(`确认从种草库移除「${template.title}」吗？`)

    if (!shouldArchive) {
      return
    }

    setPendingArchiveTemplateId(template.id)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await appDataRepository.taskTemplates.update({
        id: template.id,
        grassStatus: 'archived',
        isArchived: true,
      })

      setTemplates((current) => current.filter((item) => item.id !== template.id))
      setSuccessMessage(`已停用种草：${template.title}`)
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '种草停用失败，请稍后重试。',
      )
    } finally {
      setPendingArchiveTemplateId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="form-status-card">
        <p className="eyebrow">管理种草</p>
        <p>正在加载种草...</p>
      </div>
    )
  }

  return (
    <div className="template-manager">
      {errorMessage ? (
        <p className="form-message form-message--danger">{errorMessage}</p>
      ) : null}

      {successMessage ? (
        <p className="form-message form-message--success">{successMessage}</p>
      ) : null}

      {loadState.activityTypes.length > 0 ? (
        <div className="selection-grid selection-grid--compact" aria-label="种草清单筛选">
          {loadState.activityTypes.map((activityType) => (
            <button
              key={activityType.id}
              className={
                activityType.id === selectedActivityTypeId
                  ? 'tag-chip tag-chip--button tag-chip--selected'
                  : 'tag-chip tag-chip--button'
              }
              type="button"
              onClick={() => {
                setSelectedActivityTypeId(activityType.id)
              }}
              aria-pressed={activityType.id === selectedActivityTypeId}
            >
              <span className="tag-chip__label">{activityType.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      {loadState.sceneTags.length > 0 ? (
        <div className="selection-grid selection-grid--compact" aria-label="有空就做筛选">
          {loadState.sceneTags.map((sceneTag) => (
            <button
              key={sceneTag.id}
              className={
                selectedSceneTagIds.includes(sceneTag.id)
                  ? 'tag-chip tag-chip--button tag-chip--selected'
                  : 'tag-chip tag-chip--button'
              }
              type="button"
              onClick={() => {
                toggleSceneTag(sceneTag.id)
              }}
              aria-pressed={selectedSceneTagIds.includes(sceneTag.id)}
            >
              <span className="tag-chip__label">{sceneTag.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="template-manager__list">
        {filteredTemplates.length === 0 ? (
          <div className="empty-state-card">
            <p>当前筛选下还没有活动种草</p>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const isInterestPending = pendingInterestTemplateId === template.id
            const isArchivePending = pendingArchiveTemplateId === template.id

            return (
              <article className="template-list-item template-list-item--compact" key={template.id}>
                <div className="template-list-item__header template-list-item__header--compact">
                  <h5>{template.title}</h5>

                  <div className="template-list-item__controls">
                    <div className="template-stepper" aria-label={`调整 ${template.title} 的兴趣程度`}>
                      <button
                        className="template-stepper__button"
                        type="button"
                        disabled={isInterestPending || template.interestLevel <= INTEREST_LEVEL_MIN}
                        onClick={() => {
                          void updateInterestLevel(template, template.interestLevel - 1)
                        }}
                        aria-label={`降低 ${template.title} 的兴趣程度`}
                      >
                        −
                      </button>
                      <span className="template-stepper__value">{template.interestLevel}</span>
                      <button
                        className="template-stepper__button"
                        type="button"
                        disabled={isInterestPending || template.interestLevel >= INTEREST_LEVEL_MAX}
                        onClick={() => {
                          void updateInterestLevel(template, template.interestLevel + 1)
                        }}
                        aria-label={`提高 ${template.title} 的兴趣程度`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="template-list-item__archive"
                      type="button"
                      disabled={isArchivePending}
                      onClick={() => {
                        void archiveTemplate(template)
                      }}
                      aria-label={`停用 ${template.title}`}
                    >
                      <CloseIcon className="template-list-item__archive-icon" />
                    </button>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}

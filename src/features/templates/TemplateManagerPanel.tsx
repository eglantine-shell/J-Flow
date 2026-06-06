import { useEffect, useMemo, useState } from 'react'

import { CloseIcon, EditIcon, SaveIcon } from '@/components/ui/Icons'
import { appDataRepository } from '@/db'
import { createDecisionSelectedDayPlanItem } from '@/features/decision'
import type { TaskTemplateFormLoadState } from '@/features/templates/TemplateFormFields'
import {
  resolveTemplateTodoSchedule,
  shouldDisplayTemplateInManager,
  toDateString,
} from '@/features/templates/template-manager-state'
import type { DayPlanItem, InterestLevel, TaskTemplate } from '@/types'

const INTEREST_LEVEL_MIN = 1
const INTEREST_LEVEL_MAX = 3
type InterestSortMode = 'updatedAt' | 'interestDesc' | 'interestAsc'

const clampInterestLevel = (value: number): InterestLevel =>
  Math.min(INTEREST_LEVEL_MAX, Math.max(INTEREST_LEVEL_MIN, value)) as InterestLevel

const interestSortModeLabels: Record<InterestSortMode, string> = {
  updatedAt: '更新时间排序',
  interestDesc: '高兴趣优先',
  interestAsc: '低兴趣优先',
}

const getNextInterestSortMode = (current: InterestSortMode): InterestSortMode => {
  if (current === 'updatedAt') {
    return 'interestDesc'
  }

  if (current === 'interestDesc') {
    return 'interestAsc'
  }

  return 'updatedAt'
}

const sortTemplatesByMode = (templates: TaskTemplate[], sortMode: InterestSortMode) =>
  [...templates].sort((left, right) => {
    if (sortMode === 'interestDesc' && left.interestLevel !== right.interestLevel) {
      return right.interestLevel - left.interestLevel
    }

    if (sortMode === 'interestAsc' && left.interestLevel !== right.interestLevel) {
      return left.interestLevel - right.interestLevel
    }

    return right.updatedAt.localeCompare(left.updatedAt)
  })

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
  const [pendingTodoTemplateId, setPendingTodoTemplateId] = useState<string | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editingTitleDraft, setEditingTitleDraft] = useState('')
  const [pendingTitleTemplateId, setPendingTitleTemplateId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [dayPlanItems, setDayPlanItems] = useState<DayPlanItem[]>([])
  const [interestSortMode, setInterestSortMode] = useState<InterestSortMode>('updatedAt')

  const todayKey = toDateString(new Date())

  const loadTemplates = async () => {
    const appData = await appDataRepository.get()

    setLoadState({
      sceneTags: appData.sceneTags,
      activityTypes: appData.activityTypes,
    })

    setTemplates(
      appData.taskTemplates
        .filter((template) => template.templateKind === 'grass')
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    )
    setDayPlanItems(appData.dayPlanItems)
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

    setSelectedActivityTypeId('')
  }, [loadState.activityTypes, selectedActivityTypeId])

  const filteredTemplates = useMemo(() => {
    const nextFilteredTemplates = templates.filter((template) => {
      if (!shouldDisplayTemplateInManager(template, dayPlanItems, todayKey)) {
        return false
      }

      if (!selectedActivityTypeId) {
        return true
      }

      if (template.activityTypeId !== selectedActivityTypeId) {
        return false
      }

      if (selectedSceneTagIds.length === 0) {
        return true
      }

      return template.sceneTagIds.some((sceneTagId) => selectedSceneTagIds.includes(sceneTagId))
    })

    return sortTemplatesByMode(nextFilteredTemplates, interestSortMode)
  }, [dayPlanItems, interestSortMode, selectedActivityTypeId, selectedSceneTagIds, templates, todayKey])

  const toggleSceneTag = (sceneTagId: string) => {
    setSelectedSceneTagIds((current) =>
      current.includes(sceneTagId)
        ? current.filter((id) => id !== sceneTagId)
        : [...current, sceneTagId],
    )
  }

  const startEditingTemplateTitle = (template: TaskTemplate) => {
    setEditingTemplateId(template.id)
    setEditingTitleDraft(template.title)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const cancelEditingTemplateTitle = () => {
    setEditingTemplateId(null)
    setEditingTitleDraft('')
  }

  const saveTemplateTitle = async (template: TaskTemplate) => {
    const nextTitle = editingTitleDraft.trim()

    if (!nextTitle) {
      setErrorMessage('种草内容不能为空。')
      return
    }

    if (nextTitle === template.title) {
      cancelEditingTemplateTitle()
      return
    }

    setPendingTitleTemplateId(template.id)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const updated = await appDataRepository.taskTemplates.update({
        id: template.id,
        title: nextTitle,
      })

      setTemplates((current) =>
        current.map((item) => (item.id === template.id ? updated : item)),
      )
      setSuccessMessage(`已更新种草：${nextTitle}`)
      cancelEditingTemplateTitle()
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '种草内容更新失败，请稍后重试。',
      )
    } finally {
      setPendingTitleTemplateId(null)
    }
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
    const shouldArchive = window.confirm(`确认永久删除种草条目「${template.title}」吗？`)

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

  const moveTemplateTodoToToday = async (template: TaskTemplate) => {
    const schedule = resolveTemplateTodoSchedule(template, dayPlanItems, todayKey)

    if (schedule.kind === 'today') {
      return
    }

    setPendingTodoTemplateId(template.id)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      if (schedule.kind === 'other_day' && schedule.item) {
        const todayDayItems = dayPlanItems.filter(
          (item) =>
            item.date === todayKey &&
            item.timeBlock === 'day' &&
            item.status !== 'deleted',
        )
        const sortOrder =
          todayDayItems.length === 0
            ? 1
            : Math.max(...todayDayItems.map((item) => item.sortOrder)) + 1

        await appDataRepository.dayPlanItems.update({
          id: schedule.item.id,
          date: todayKey,
          timeBlock: 'day',
          timeBlockSource: 'default_day',
          sortOrder,
        })

        setSuccessMessage(`已移至今日：${template.title}`)
      } else {
        await createDecisionSelectedDayPlanItem({
          selectedDate: new Date(),
          timeBlock: 'day',
          template,
          options: {
            isNecessary: false,
            requiresPreparation: false,
            preparationNotes: '',
            isSegmented: false,
          },
        })

        setSuccessMessage(`已加入今日：${template.title}`)
      }

      await loadTemplates()
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '加入今日 Todo 失败，请稍后重试。',
      )
    } finally {
      setPendingTodoTemplateId(null)
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

      <div className="template-manager__controls">
        <div className="template-manager__topbar">
          <span className="template-manager__count">未完成 {filteredTemplates.length} 条</span>
          <button
            className="template-manager__count template-manager__sort-button"
            type="button"
            onClick={() => {
              setInterestSortMode((current) => getNextInterestSortMode(current))
            }}
            aria-label={`当前${interestSortModeLabels[interestSortMode]}，点击切换种草排序`}
          >
            {interestSortModeLabels[interestSortMode]}
          </button>
        </div>

        <div className="template-manager__filters">
          {loadState.activityTypes.length > 0 ? (
            <div className="template-manager__filter-group template-manager__filter-group--inline">
              <p className="template-manager__filter-label">按清单筛选</p>
              <div className="selection-grid selection-grid--compact" aria-label="种草清单筛选">
                <button
                  className={
                    selectedActivityTypeId === ''
                      ? 'tag-chip tag-chip--button tag-chip--selected'
                      : 'tag-chip tag-chip--button'
                  }
                  type="button"
                  onClick={() => {
                    setSelectedActivityTypeId('')
                  }}
                  aria-pressed={selectedActivityTypeId === ''}
                >
                  <span className="tag-chip__label">全部</span>
                </button>
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
            </div>
          ) : null}

          {loadState.sceneTags.length > 0 ? (
            <div className="template-manager__filter-group template-manager__filter-group--inline">
              <p className="template-manager__filter-label">按场景筛选</p>
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
            </div>
          ) : null}
        </div>
      </div>

      <div className="template-manager__list">
        {filteredTemplates.length === 0 ? (
          <div className="empty-state-card empty-state-card--manager">
            <p>当前筛选下还没有未完成种草</p>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const isInterestPending = pendingInterestTemplateId === template.id
            const isArchivePending = pendingArchiveTemplateId === template.id
            const isTodoPending = pendingTodoTemplateId === template.id
            const isTitlePending = pendingTitleTemplateId === template.id
            const isEditingTitle = editingTemplateId === template.id
            const schedule = resolveTemplateTodoSchedule(template, dayPlanItems, todayKey)
            const isTodayScheduled = schedule.kind === 'today'
            const todoButtonLabel = isTodoPending ? '处理中' : 'TODO！'

            return (
              <article className="template-list-item template-list-item--compact" key={template.id}>
                <div className="template-list-item__header template-list-item__header--compact">
                  <div className="template-list-item__main">
                    <div className="template-list-item__title-group">
                      {isEditingTitle ? (
                        <div className="template-list-item__title-editor">
                          <input
                            className="template-list-item__title-input"
                            type="text"
                            value={editingTitleDraft}
                            disabled={isTitlePending}
                            onChange={(event) => {
                              setEditingTitleDraft(event.target.value)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                void saveTemplateTitle(template)
                              }

                              if (event.key === 'Escape') {
                                event.preventDefault()
                                cancelEditingTemplateTitle()
                              }
                            }}
                            aria-label={`编辑 ${template.title} 的种草内容`}
                          />
                          <button
                            className="template-list-item__icon-button"
                            type="button"
                            disabled={isTitlePending}
                            onClick={() => {
                              void saveTemplateTitle(template)
                            }}
                            aria-label={`保存 ${template.title} 的种草内容`}
                            title="保存种草内容"
                          >
                            <SaveIcon className="template-list-item__icon" />
                          </button>
                          <button
                            className="template-list-item__icon-button"
                            type="button"
                            disabled={isTitlePending}
                            onClick={cancelEditingTemplateTitle}
                            aria-label={`取消编辑 ${template.title}`}
                            title="取消编辑"
                          >
                            <CloseIcon className="template-list-item__icon" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h5>{template.title}</h5>
                          <button
                            className="template-list-item__icon-button"
                            type="button"
                            onClick={() => {
                              startEditingTemplateTitle(template)
                            }}
                            aria-label={`编辑 ${template.title}`}
                            title="编辑种草内容"
                          >
                            <EditIcon className="template-list-item__icon" />
                          </button>
                        </>
                      )}
                      {schedule.label ? (
                        <span className="template-list-item__status-badge">{schedule.label}</span>
                      ) : null}
                    </div>
                    <div className="template-list-item__meta">
                      <span className="template-list-item__activity-type">
                        {loadState.activityTypes.find((item) => item.id === template.activityTypeId)?.name ?? '未分类'}
                      </span>
                      {template.sceneTagIds
                        .map((sceneTagId) =>
                          loadState.sceneTags.find((item) => item.id === sceneTagId)?.name,
                        )
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((name) => (
                          <span className="template-list-item__scene-tag" key={`${template.id}-${name}`}>
                            {name}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="template-list-item__controls">
                    <span className="template-list-item__interest-label">兴趣程度</span>
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
                      className="template-list-item__todo-button"
                      type="button"
                      disabled={isTodoPending || isTodayScheduled}
                      onClick={() => {
                        void moveTemplateTodoToToday(template)
                      }}
                      aria-label={
                        isTodayScheduled
                          ? `${template.title} 已在今日 Todo`
                          : schedule.kind === 'other_day'
                            ? `将 ${template.title} 移至今日 Todo`
                            : `将 ${template.title} 加入今日 Todo`
                      }
                    >
                      {todoButtonLabel}
                    </button>

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

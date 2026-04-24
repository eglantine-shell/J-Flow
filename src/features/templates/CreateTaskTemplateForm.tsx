import { useEffect, useState } from 'react'

import { appDataRepository } from '@/db'
import {
  createInitialTaskTemplateFormState,
  getEffectiveTemplateDate,
  TaskTemplateFormFields,
  type TaskTemplateFormLoadState,
  type TaskTemplateFormState,
  validateTaskTemplateForm,
} from '@/features/templates/TemplateFormFields'

export function CreateTaskTemplateForm() {
  const [formState, setFormState] = useState<TaskTemplateFormState>(
    createInitialTaskTemplateFormState,
  )
  const [loadState, setLoadState] = useState<TaskTemplateFormLoadState>({
    sceneTags: [],
    activityTypes: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void Promise.all([
      appDataRepository.sceneTags.list(),
      appDataRepository.activityTypes.list(),
    ])
      .then(([sceneTags, activityTypes]) => {
        if (cancelled) {
          return
        }

        setLoadState({
          sceneTags,
          activityTypes,
        })

        setFormState((current) => ({
          ...current,
          activityTypeId: current.activityTypeId || activityTypes[0]?.id || '',
        }))
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error ? error.message : '表单初始化失败，请稍后重试。',
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

  const validationMessage = validateTaskTemplateForm(formState)

  const handleCreateSceneTag = async (name: string) => {
    const created = await appDataRepository.sceneTags.create({
      name,
      isBuiltIn: false,
    })

    setLoadState((current) => ({
      ...current,
      sceneTags: [...current.sceneTags, created],
    }))
    setFormState((current) => ({
      ...current,
      sceneTagIds: current.sceneTagIds.includes(created.id)
        ? current.sceneTagIds
        : [...current.sceneTagIds, created.id],
    }))
    setErrorMessage(null)
    setSuccessMessage(`已新增时间场景：${created.name}`)
  }

  const handleCreateActivityType = async (name: string) => {
    const created = await appDataRepository.activityTypes.create({
      name,
      isBuiltIn: false,
    })

    setLoadState((current) => ({
      ...current,
      activityTypes: [...current.activityTypes, created],
    }))
    setFormState((current) => ({
      ...current,
      activityTypeId: created.id,
    }))
    setErrorMessage(null)
    setSuccessMessage(`已新增活动类型：${created.name}`)
  }

  const handleDeleteSceneTag = async (sceneTag: TaskTemplateFormLoadState['sceneTags'][number]) => {
    const shouldDelete = window.confirm('将从所有条目中移除此标签，不删除条目本身。')

    if (!shouldDelete) {
      return
    }

    await appDataRepository.sceneTags.deleteAndDetachTemplates(sceneTag.id)

    setLoadState((current) => ({
      ...current,
      sceneTags: current.sceneTags.filter((item) => item.id !== sceneTag.id),
    }))
    setFormState((current) => ({
      ...current,
      sceneTagIds: current.sceneTagIds.filter((id) => id !== sceneTag.id),
    }))
    setErrorMessage(null)
    setSuccessMessage(`已删除时间场景：${sceneTag.name}`)
  }

  const handleDeleteActivityType = async (
    activityType: TaskTemplateFormLoadState['activityTypes'][number],
  ) => {
    if (loadState.activityTypes.length <= 1) {
      throw new Error('至少保留一个活动类型，才能继续录入模板。')
    }

    const result = await appDataRepository.activityTypes.deleteIfUnused(activityType.id)

    if (!result.removed) {
      if (result.reason === 'in_use') {
        throw new Error('该活动类型仍被使用，需先修改或删除相关条目后再删除。')
      }

      throw new Error('活动类型删除失败，请稍后重试。')
    }

    const nextActivityTypes = loadState.activityTypes.filter((item) => item.id !== activityType.id)

    setLoadState((current) => ({
      ...current,
      activityTypes: nextActivityTypes,
    }))
    setFormState((current) => ({
      ...current,
      activityTypeId:
        current.activityTypeId === activityType.id
          ? nextActivityTypes[0]?.id || ''
          : current.activityTypeId,
    }))
    setErrorMessage(null)
    setSuccessMessage(`已删除活动类型：${activityType.name}`)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (validationMessage) {
      setErrorMessage(validationMessage)
      setSuccessMessage(null)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const created = await appDataRepository.taskTemplates.create({
        date: getEffectiveTemplateDate(formState),
        activityTypeId: formState.activityTypeId,
        title: formState.title.trim(),
        sceneTagIds: formState.sceneTagIds,
        interestLevel: formState.interestLevel,
        isNecessary: formState.isNecessary,
        requiresPreparation: formState.requiresPreparation,
        preparationNotes: formState.requiresPreparation
          ? formState.preparationNotes.trim()
          : '',
        recurrence: formState.recurrence,
        isSegmented: formState.isSegmented,
        isArchived: false,
      })

      setFormState({
        ...createInitialTaskTemplateFormState(),
        activityTypeId: loadState.activityTypes[0]?.id || '',
      })
      setSuccessMessage(`已加入决策库：${created.title}`)
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '条目录入失败，请稍后重试。',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="form-status-card">
        <p className="eyebrow">新增模板</p>
        <p>正在加载表单...</p>
      </div>
    )
  }

  return (
    <form className="template-form" onSubmit={handleSubmit}>
      <TaskTemplateFormFields
        formState={formState}
        setFormState={setFormState}
        loadState={loadState}
        onCreateSceneTag={handleCreateSceneTag}
        onCreateActivityType={handleCreateActivityType}
        onDeleteSceneTag={handleDeleteSceneTag}
        onDeleteActivityType={handleDeleteActivityType}
      />

      {errorMessage ? (
        <p className="form-message form-message--danger">{errorMessage}</p>
      ) : null}

      {successMessage ? (
        <p className="form-message form-message--success">{successMessage}</p>
      ) : null}

      <div className="setup-actions">
        <button
          className="primary-button"
          type="submit"
          disabled={isSaving || loadState.activityTypes.length === 0}
        >
          {isSaving ? '保存中...' : '保存模板'}
        </button>
      </div>
    </form>
  )
}

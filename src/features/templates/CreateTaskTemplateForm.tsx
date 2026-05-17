import { useEffect, useMemo, useState } from 'react'

import { appDataRepository } from '@/db'
import {
  createInitialTaskTemplateFormState,
  parseGrassBatchTitles,
  TaskTemplateFormFields,
  type TaskTemplateFormLoadState,
  type TaskTemplateFormState,
  validateTaskTemplateForm,
} from '@/features/templates/TemplateFormFields'
import type { TaskTemplate } from '@/types'

const cloneTaskTemplate = (template: TaskTemplate): TaskTemplate => ({
  ...template,
  sceneTagIds: [...template.sceneTagIds],
})

const hasAllCreatedTemplates = (templates: TaskTemplate[], createdItems: TaskTemplate[]) =>
  createdItems.every((createdItem) =>
    templates.some((template) => template.id === createdItem.id),
  )

async function ensureCreatedTemplatesPersisted(createdItems: TaskTemplate[]) {
  const currentTemplates = await appDataRepository.taskTemplates.list()

  if (hasAllCreatedTemplates(currentTemplates, createdItems)) {
    return
  }

  const existingIds = new Set(currentTemplates.map((template) => template.id))
  const missingItems = createdItems.filter((createdItem) => !existingIds.has(createdItem.id))

  for (const item of missingItems) {
    await appDataRepository.taskTemplates.create(cloneTaskTemplate(item))
  }

  const verifiedTemplates = await appDataRepository.taskTemplates.list()

  if (!hasAllCreatedTemplates(verifiedTemplates, createdItems)) {
    throw new Error('批量种草保存后校验失败，请重试。')
  }
}

export function CreateTaskTemplateForm({
  formId = 'grass-create-form',
  onSubmitStateChange,
}: {
  formId?: string
  onSubmitStateChange?: (state: { canSubmit: boolean; isSaving: boolean }) => void
}) {
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
  const canSubmit = useMemo(
    () => !validationMessage && !isSaving && loadState.activityTypes.length > 0,
    [validationMessage, isSaving, loadState.activityTypes.length],
  )

  useEffect(() => {
    onSubmitStateChange?.({
      canSubmit,
      isSaving,
    })
  }, [canSubmit, isSaving, onSubmitStateChange])

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
    setSuccessMessage(`已新增有空就做：${created.name}`)
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
    setSuccessMessage(`已新增种草清单：${created.name}`)
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
    setSuccessMessage(`已删除有空就做：${sceneTag.name}`)
  }

  const handleDeleteActivityType = async (
    activityType: TaskTemplateFormLoadState['activityTypes'][number],
  ) => {
    if (loadState.activityTypes.length <= 1) {
      throw new Error('至少保留一个种草清单，才能继续新增种草。')
    }

    const result = await appDataRepository.activityTypes.deleteIfUnused(activityType.id)

    if (!result.removed) {
      if (result.reason === 'in_use') {
        throw new Error('该种草清单仍被使用，需先修改或停用相关种草后再删除。')
      }

      throw new Error('种草清单删除失败，请稍后重试。')
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
    setSuccessMessage(`已删除种草清单：${activityType.name}`)
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
      const parsedTitles = parseGrassBatchTitles(formState.title)
      const createdItems: TaskTemplate[] = []

      for (const title of parsedTitles) {
        const createdItem = await appDataRepository.taskTemplates.create({
          templateKind: 'grass',
          date: '',
          activityTypeId: formState.activityTypeId,
          title,
          sceneTagIds: formState.sceneTagIds,
          interestLevel: formState.interestLevel,
          isNecessary: false,
          requiresPreparation: false,
          preparationNotes: '',
          recurrence: 'none',
          isSegmented: false,
          grassStatus: 'active',
          isArchived: false,
        })

        createdItems.push(createdItem)
      }
      await ensureCreatedTemplatesPersisted(createdItems)

      setFormState({
        ...createInitialTaskTemplateFormState(),
        activityTypeId: loadState.activityTypes[0]?.id || '',
      })
      setSuccessMessage(
        createdItems.length === 1
          ? `已加入种草：${createdItems[0]?.title ?? ''}`
          : `已加入 ${createdItems.length} 条种草`,
      )
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '种草保存失败，请稍后重试。',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="form-status-card">
        <p className="eyebrow">新增种草</p>
        <p>正在加载种草表单...</p>
      </div>
    )
  }

  return (
    <form className="template-form template-form--capture" id={formId} onSubmit={handleSubmit}>
      <TaskTemplateFormFields
        formState={formState}
        setFormState={setFormState}
        loadState={loadState}
        onCreateSceneTag={handleCreateSceneTag}
        onCreateActivityType={handleCreateActivityType}
        onDeleteSceneTag={handleDeleteSceneTag}
        onDeleteActivityType={handleDeleteActivityType}
      />

      <div className="template-form__footer">
        {errorMessage ? (
          <p className="form-message form-message--danger">{errorMessage}</p>
        ) : null}

        {successMessage ? (
          <p className="form-message form-message--success">{successMessage}</p>
        ) : null}
      </div>
    </form>
  )
}

import { useEffect, useState } from 'react'

import { appDataRepository } from '@/db'
import {
  createInitialTaskTemplateFormState,
  TaskTemplateFormFields,
  type TaskTemplateFormLoadState,
  type TaskTemplateFormState,
  validateTaskTemplateForm,
} from '@/features/templates/TemplateFormFields'
import type { TaskTemplate } from '@/types'

const toFormState = (template: TaskTemplate): TaskTemplateFormState => ({
  date: template.date,
  activityTypeId: template.activityTypeId,
  title: template.title,
  sceneTagIds: template.sceneTagIds,
  interestLevel: template.interestLevel,
  isNecessary: template.isNecessary,
  requiresPreparation: template.requiresPreparation,
  preparationNotes: template.preparationNotes,
  recurrence: template.recurrence,
  isSegmented: template.isSegmented,
})

export function TemplateManagerPanel() {
  const [loadState, setLoadState] = useState<TaskTemplateFormLoadState>({
    sceneTags: [],
    activityTypes: [],
  })
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [formState, setFormState] = useState<TaskTemplateFormState>(
    createInitialTaskTemplateFormState,
  )
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
        .filter((template) => !template.isArchived)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    )
  }

  useEffect(() => {
    let cancelled = false

    void loadTemplates()
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : '模板列表读取失败，请稍后重试。',
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

  const editingTemplate = templates.find((template) => template.id === editingTemplateId) ?? null
  const validationMessage = formState ? validateTaskTemplateForm(formState) : null

  const startEditing = (template: TaskTemplate) => {
    setEditingTemplateId(template.id)
    setFormState(toFormState(template))
    setShowAdvancedFields(
      template.requiresPreparation || template.recurrence !== 'none' || template.isSegmented,
    )
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const cancelEditing = () => {
    setEditingTemplateId(null)
    setFormState(createInitialTaskTemplateFormState())
    setShowAdvancedFields(false)
  }

  const saveTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editingTemplateId || !formState) {
      return
    }

    if (validationMessage) {
      setErrorMessage(validationMessage)
      setSuccessMessage(null)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const updated: TaskTemplate = await appDataRepository.taskTemplates.update({
        id: editingTemplateId,
        date: formState.date,
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
      })

      await loadTemplates()
      setEditingTemplateId(updated.id)
      setFormState(toFormState(updated))
      setSuccessMessage(`已更新模板：${updated.title}`)
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '模板保存失败，请稍后重试。',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const archiveTemplate = async (template: TaskTemplate) => {
    const shouldArchive = window.confirm(
      `确认停用「${template.title}」吗？停用后它将不再参与未来自动生成与推荐，但不会改动已有实例。`,
    )

    if (!shouldArchive) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await appDataRepository.taskTemplates.update({
        id: template.id,
        isArchived: true,
      })

      if (editingTemplateId === template.id) {
        cancelEditing()
      }

      await loadTemplates()
      setSuccessMessage(`已停用模板：${template.title}`)
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : '模板停用失败，请稍后重试。',
      )
    }
  }

  if (isLoading) {
    return (
      <div className="form-status-card">
        <p className="eyebrow">模板管理</p>
        <p>正在加载模板...</p>
      </div>
    )
  }

  return (
    <div className="template-manager">
      <div className="template-manager__intro">
        <div>
          <p className="eyebrow">Templates</p>
          <h4>模板</h4>
        </div>
        <p>{templates.length} 个模板</p>
      </div>

      {errorMessage ? (
        <p className="form-message form-message--danger">{errorMessage}</p>
      ) : null}

      {successMessage ? (
        <p className="form-message form-message--success">{successMessage}</p>
      ) : null}

      <div className="template-manager__layout">
        <div className="template-manager__list">
          {templates.length === 0 ? (
            <div className="empty-state-card">
              <p>还没有模板</p>
            </div>
          ) : (
            templates.map((template) => (
              <article className="template-list-item" key={template.id}>
                <div className="template-list-item__header">
                  <div>
                    <h5>{template.title}</h5>
                    <p>{template.date}</p>
                  </div>
                  <div className="template-list-item__actions">
                    <button
                      className="ghost-button ghost-button--compact"
                      type="button"
                      onClick={() => {
                        startEditing(template)
                      }}
                    >
                      编辑
                    </button>
                    <button
                      className="ghost-button ghost-button--compact"
                      type="button"
                      onClick={() => {
                        void archiveTemplate(template)
                      }}
                    >
                      停用
                    </button>
                  </div>
                </div>

                <div className="template-list-item__meta">
                  <span className={template.isNecessary ? 'status-chip status-chip--necessary' : 'status-chip'}>
                    {template.isNecessary ? '必要' : '普通'}
                  </span>
                  <span className="status-chip">兴趣 {template.interestLevel}</span>
                  <span className="status-chip">{template.recurrence}</span>
                  {template.isSegmented ? <span className="status-chip">分次</span> : null}
                  {template.requiresPreparation ? <span className="status-chip">准备</span> : null}
                  {template.sceneTagIds.length > 0 ? (
                    <span className="status-chip">{template.sceneTagIds.length} 个场景</span>
                  ) : (
                    <span className="status-chip">无场景</span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="template-manager__editor">
          {editingTemplate ? (
            <form className="template-form" onSubmit={saveTemplate}>
              <div className="template-manager__editor-header">
                <div>
                  <p className="eyebrow">编辑</p>
                  <h4>{editingTemplate.title}</h4>
                </div>
                <button className="ghost-button" type="button" onClick={cancelEditing}>
                  关闭
                </button>
              </div>

              <TaskTemplateFormFields
                formState={formState}
                setFormState={setFormState}
                loadState={loadState}
                showAdvancedFields={showAdvancedFields}
                setShowAdvancedFields={setShowAdvancedFields}
              />

              <div className="setup-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? '保存中...' : '保存模板'}
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-state-card">
              <p>选择一个模板开始编辑</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

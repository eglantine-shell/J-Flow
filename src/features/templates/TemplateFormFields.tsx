import { useState } from 'react'
import type { Dispatch, KeyboardEvent, SetStateAction } from 'react'

import type {
  ActivityType,
  InterestLevel,
  RecurrenceRule,
  SceneTag,
} from '@/types'

export type TaskTemplateFormState = {
  date: string
  activityTypeId: string
  title: string
  sceneTagIds: string[]
  interestLevel: InterestLevel
  isNecessary: boolean
  requiresPreparation: boolean
  preparationNotes: string
  recurrence: RecurrenceRule
  isSegmented: boolean
}

export type TaskTemplateFormLoadState = {
  sceneTags: SceneTag[]
  activityTypes: ActivityType[]
}

const pad = (value: number) => String(value).padStart(2, '0')

const todayDateString = () => {
  const now = new Date()

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const interestOptions: Array<{
  label: string
  value: InterestLevel
}> = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
]

export const recurrenceOptions: Array<{
  label: string
  value: RecurrenceRule
}> = [
  { label: '不重复', value: 'none' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: '每年', value: 'yearly' },
]

export const createInitialTaskTemplateFormState = (): TaskTemplateFormState => ({
  date: '',
  activityTypeId: '',
  title: '',
  sceneTagIds: [],
  interestLevel: 2,
  isNecessary: false,
  requiresPreparation: false,
  preparationNotes: '',
  recurrence: 'none',
  isSegmented: false,
})

export const shouldShowTemplateDate = (formState: TaskTemplateFormState) =>
  formState.isNecessary || formState.recurrence !== 'none'

export const getEffectiveTemplateDate = (formState: TaskTemplateFormState) =>
  shouldShowTemplateDate(formState) ? formState.date : ''

const syncDateVisibility = (nextState: TaskTemplateFormState): TaskTemplateFormState => {
  if (shouldShowTemplateDate(nextState)) {
    return {
      ...nextState,
      date: nextState.date || todayDateString(),
    }
  }

  return {
    ...nextState,
    date: '',
  }
}

export function validateTaskTemplateForm(formState: TaskTemplateFormState) {
  return shouldShowTemplateDate(formState) && !formState.date
    ? '请填写日期。'
    : !formState.activityTypeId
      ? '请选择活动类型。'
      : formState.title.trim().length === 0
        ? '请填写具体内容。'
        : null
}

export function TaskTemplateFormFields({
  formState,
  setFormState,
  loadState,
  onCreateSceneTag,
  onCreateActivityType,
}: {
  formState: TaskTemplateFormState
  setFormState: Dispatch<SetStateAction<TaskTemplateFormState>>
  loadState: TaskTemplateFormLoadState
  onCreateSceneTag?: (name: string) => Promise<void>
  onCreateActivityType?: (name: string) => Promise<void>
}) {
  const [showSceneTagCreator, setShowSceneTagCreator] = useState(false)
  const [sceneTagDraft, setSceneTagDraft] = useState('')
  const [sceneTagError, setSceneTagError] = useState<string | null>(null)
  const [isCreatingSceneTag, setIsCreatingSceneTag] = useState(false)
  const [showActivityTypeCreator, setShowActivityTypeCreator] = useState(false)
  const [activityTypeDraft, setActivityTypeDraft] = useState('')
  const [activityTypeError, setActivityTypeError] = useState<string | null>(null)
  const [isCreatingActivityType, setIsCreatingActivityType] = useState(false)

  const showDateField = shouldShowTemplateDate(formState)

  const updateFormState = (updater: (current: TaskTemplateFormState) => TaskTemplateFormState) => {
    setFormState((current) => syncDateVisibility(updater(current)))
  }

  const handleSceneTagToggle = (sceneTagId: string) => {
    updateFormState((current) => ({
      ...current,
      sceneTagIds: current.sceneTagIds.includes(sceneTagId)
        ? current.sceneTagIds.filter((id) => id !== sceneTagId)
        : [...current.sceneTagIds, sceneTagId],
    }))
  }

  const handleActivityTypeSelect = (activityTypeId: string) => {
    updateFormState((current) => ({
      ...current,
      activityTypeId,
    }))
  }

  const submitSceneTagDraft = async () => {
    const nextName = sceneTagDraft.trim()

    if (!nextName) {
      setSceneTagError('请输入时间场景名称。')
      return
    }

    if (!onCreateSceneTag) {
      return
    }

    setIsCreatingSceneTag(true)
    setSceneTagError(null)

    try {
      await onCreateSceneTag(nextName)
      setSceneTagDraft('')
      setShowSceneTagCreator(false)
    } catch (error: unknown) {
      setSceneTagError(
        error instanceof Error ? error.message : '新增时间场景失败，请稍后重试。',
      )
    } finally {
      setIsCreatingSceneTag(false)
    }
  }

  const submitActivityTypeDraft = async () => {
    const nextName = activityTypeDraft.trim()

    if (!nextName) {
      setActivityTypeError('请输入活动类型名称。')
      return
    }

    if (!onCreateActivityType) {
      return
    }

    setIsCreatingActivityType(true)
    setActivityTypeError(null)

    try {
      await onCreateActivityType(nextName)
      setActivityTypeDraft('')
      setShowActivityTypeCreator(false)
    } catch (error: unknown) {
      setActivityTypeError(
        error instanceof Error ? error.message : '新增活动类型失败，请稍后重试。',
      )
    } finally {
      setIsCreatingActivityType(false)
    }
  }

  const handleInlineSubmit = (
    event: KeyboardEvent<HTMLInputElement>,
    submit: () => Promise<void>,
  ) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    void submit()
  }

  return (
    <div className="template-form__compact">
      <div className="template-form__row template-form__row--content">
        <textarea
          className="template-form__content-input"
          rows={2}
          value={formState.title}
          onChange={(event) => {
            updateFormState((current) => ({
              ...current,
              title: event.target.value,
            }))
          }}
          placeholder="输入模板内容"
          aria-label="模板内容"
        />
      </div>

      <div className="template-form__row">
        <div className="selection-grid selection-grid--compact" aria-label="活动类型">
          {loadState.activityTypes.map((activityType) => (
            <button
              key={activityType.id}
              className={
                formState.activityTypeId === activityType.id
                  ? 'check-tile check-tile--selected'
                  : 'check-tile'
              }
              type="button"
              onClick={() => {
                handleActivityTypeSelect(activityType.id)
              }}
            >
              {activityType.name}
            </button>
          ))}

          {onCreateActivityType ? (
            showActivityTypeCreator ? (
              <div className="creator-tag">
                <span className="creator-tag__prefix">+</span>
                <input
                  className="creator-tag__input"
                  type="text"
                  value={activityTypeDraft}
                  onChange={(event) => {
                    setActivityTypeDraft(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    handleInlineSubmit(event, submitActivityTypeDraft)
                  }}
                  placeholder="活动类型"
                  autoFocus
                />
              </div>
            ) : (
              <button
                className="check-tile check-tile--create"
                type="button"
                onClick={() => {
                  setShowActivityTypeCreator(true)
                  setActivityTypeError(null)
                }}
                aria-label="新增活动类型"
              >
                +
              </button>
            )
          ) : null}
        </div>

        {activityTypeError ? (
          <p className="form-message form-message--danger">{activityTypeError}</p>
        ) : null}
      </div>

      <div className="template-form__row">
        <div className="selection-grid selection-grid--compact" aria-label="时间场景">
          {loadState.sceneTags.map((sceneTag) => (
            <button
              key={sceneTag.id}
              className={
                formState.sceneTagIds.includes(sceneTag.id)
                  ? 'check-tile check-tile--selected'
                  : 'check-tile'
              }
              type="button"
              onClick={() => {
                handleSceneTagToggle(sceneTag.id)
              }}
            >
              {sceneTag.name}
            </button>
          ))}

          {onCreateSceneTag ? (
            showSceneTagCreator ? (
              <div className="creator-tag">
                <span className="creator-tag__prefix">+</span>
                <input
                  className="creator-tag__input"
                  type="text"
                  value={sceneTagDraft}
                  onChange={(event) => {
                    setSceneTagDraft(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    handleInlineSubmit(event, submitSceneTagDraft)
                  }}
                  placeholder="时间场景"
                  autoFocus
                />
              </div>
            ) : (
              <button
                className="check-tile check-tile--create"
                type="button"
                onClick={() => {
                  setShowSceneTagCreator(true)
                  setSceneTagError(null)
                }}
                aria-label="新增时间场景"
              >
                +
              </button>
            )
          ) : null}
        </div>

        {sceneTagError ? (
          <p className="form-message form-message--danger">{sceneTagError}</p>
        ) : null}
      </div>

      <div className="template-form__row template-form__row--inline">
        <div className="template-form__inline-field">
          <span>兴趣程度</span>
          <div className="segmented-control">
            {interestOptions.map((option) => (
              <button
                key={option.value}
                className={
                  option.value === formState.interestLevel
                    ? 'segmented-control__button segmented-control__button--active'
                    : 'segmented-control__button'
                }
                type="button"
                onClick={() => {
                  updateFormState((current) => ({
                    ...current,
                    interestLevel: option.value,
                  }))
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="template-form__row template-form__row--inline template-form__row--decision">
        <label className="toggle-chip">
          <input
            type="checkbox"
            checked={formState.isNecessary}
            onChange={(event) => {
              updateFormState((current) => ({
                ...current,
                isNecessary: event.target.checked,
              }))
            }}
          />
          <span>必要事项</span>
        </label>

        <select
          className="template-form__recurrence-select"
          value={formState.recurrence}
          onChange={(event) => {
            updateFormState((current) => ({
              ...current,
              recurrence: event.target.value as RecurrenceRule,
            }))
          }}
          aria-label="重复规则"
        >
          {recurrenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {showDateField ? (
        <div className="template-form__row">
          <input
            className="template-form__date-input"
            type="date"
            value={formState.date}
            onChange={(event) => {
              updateFormState((current) => ({
                ...current,
                date: event.target.value,
              }))
            }}
            aria-label="日期"
          />
        </div>
      ) : null}

      <div className="template-form__row template-form__row--inline">
        <label className="toggle-chip">
          <input
            type="checkbox"
            checked={formState.requiresPreparation}
            onChange={(event) => {
              const checked = event.target.checked

              updateFormState((current) => ({
                ...current,
                requiresPreparation: checked,
                preparationNotes: checked ? current.preparationNotes : '',
              }))
            }}
          />
          <span>需要准备</span>
        </label>

        <label className="toggle-chip">
          <input
            type="checkbox"
            checked={formState.isSegmented}
            onChange={(event) => {
              updateFormState((current) => ({
                ...current,
                isSegmented: event.target.checked,
              }))
            }}
          />
          <span>分次事项</span>
        </label>
      </div>

      {formState.requiresPreparation ? (
        <div className="template-form__row">
          <textarea
            className="template-form__notes-input"
            rows={2}
            value={formState.preparationNotes}
            onChange={(event) => {
              updateFormState((current) => ({
                ...current,
                preparationNotes: event.target.value,
              }))
            }}
            placeholder="准备备注"
            aria-label="准备备注"
          />
        </div>
      ) : null}
    </div>
  )
}

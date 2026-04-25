import { useState } from 'react'
import type { Dispatch, KeyboardEvent, SetStateAction } from 'react'

import { CheckIcon, CloseIcon, PlusIcon } from '@/components/ui/Icons'
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
      ? '请选择种草清单。'
      : formState.title.trim().length === 0
        ? '请填写种草内容。'
        : null
}

export function TaskTemplateFormFields({
  formState,
  setFormState,
  loadState,
  onCreateSceneTag,
  onCreateActivityType,
  onDeleteSceneTag,
  onDeleteActivityType,
}: {
  formState: TaskTemplateFormState
  setFormState: Dispatch<SetStateAction<TaskTemplateFormState>>
  loadState: TaskTemplateFormLoadState
  onCreateSceneTag?: (name: string) => Promise<void>
  onCreateActivityType?: (name: string) => Promise<void>
  onDeleteSceneTag?: (sceneTag: SceneTag) => Promise<void>
  onDeleteActivityType?: (activityType: ActivityType) => Promise<void>
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
      setSceneTagError('请输入“有空就做”名称。')
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
        error instanceof Error ? error.message : '新增“有空就做”失败，请稍后重试。',
      )
    } finally {
      setIsCreatingSceneTag(false)
    }
  }

  const submitActivityTypeDraft = async () => {
    const nextName = activityTypeDraft.trim()

    if (!nextName) {
      setActivityTypeError('请输入种草清单名称。')
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
        error instanceof Error ? error.message : '新增种草清单失败，请稍后重试。',
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

  const handleSceneTagDelete = async (sceneTag: SceneTag) => {
    if (!onDeleteSceneTag) {
      return
    }

    setSceneTagError(null)

    try {
      await onDeleteSceneTag(sceneTag)
      updateFormState((current) => ({
        ...current,
        sceneTagIds: current.sceneTagIds.filter((id) => id !== sceneTag.id),
      }))
    } catch (error: unknown) {
      setSceneTagError(
        error instanceof Error ? error.message : '删除“有空就做”失败，请稍后重试。',
      )
    }
  }

  const handleActivityTypeDelete = async (activityType: ActivityType) => {
    if (!onDeleteActivityType) {
      return
    }

    setActivityTypeError(null)

    try {
      await onDeleteActivityType(activityType)
    } catch (error: unknown) {
      setActivityTypeError(
        error instanceof Error ? error.message : '删除种草清单失败，请稍后重试。',
      )
    }
  }

  return (
    <div className="template-form__compact">
      <div className="template-form__row">
        <div className="selection-grid selection-grid--compact" aria-label="种草清单">
          {loadState.activityTypes.map((activityType) => (
            <div
              key={activityType.id}
              className={
                formState.activityTypeId === activityType.id
                  ? 'tag-chip tag-chip--selected'
                  : 'tag-chip'
              }
            >
              <button
                className="tag-chip__label tag-chip__label--button"
                type="button"
                onClick={() => {
                  handleActivityTypeSelect(activityType.id)
                }}
              >
                {activityType.name}
              </button>
              <span className="tag-chip__divider" aria-hidden="true" />
              <button
                className="tag-chip__action"
                type="button"
                onClick={() => {
                  void handleActivityTypeDelete(activityType)
                }}
                aria-label={`删除种草清单 ${activityType.name}`}
              >
                <CloseIcon className="tag-chip__icon" />
              </button>
            </div>
          ))}

          {onCreateActivityType ? (
            showActivityTypeCreator ? (
              <div className="tag-chip tag-chip--creator">
                <input
                  className="tag-chip__input"
                  type="text"
                  value={activityTypeDraft}
                  onChange={(event) => {
                    setActivityTypeDraft(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    handleInlineSubmit(event, submitActivityTypeDraft)
                  }}
                  placeholder="种草清单"
                  autoFocus
                />
                <span className="tag-chip__divider" aria-hidden="true" />
                <button
                  className="tag-chip__action tag-chip__action--confirm"
                  type="button"
                  onClick={() => {
                    void submitActivityTypeDraft()
                  }}
                  disabled={isCreatingActivityType}
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
                  setActivityTypeError(null)
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
            )
          ) : null}
        </div>

        {activityTypeError ? (
          <p className="form-message form-message--danger">{activityTypeError}</p>
        ) : null}
      </div>

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
          placeholder="输入种草内容"
          aria-label="种草内容"
        />
      </div>

      <div className="template-form__row">
        <div className="selection-grid selection-grid--compact" aria-label="有空就做">
          {loadState.sceneTags.map((sceneTag) => (
            <div
              key={sceneTag.id}
              className={
                formState.sceneTagIds.includes(sceneTag.id)
                  ? 'tag-chip tag-chip--selected'
                  : 'tag-chip'
              }
            >
              <button
                className="tag-chip__label tag-chip__label--button"
                type="button"
                onClick={() => {
                  handleSceneTagToggle(sceneTag.id)
                }}
              >
                {sceneTag.name}
              </button>
              <span className="tag-chip__divider" aria-hidden="true" />
              <button
                className="tag-chip__action"
                type="button"
                onClick={() => {
                  void handleSceneTagDelete(sceneTag)
                }}
                aria-label={`删除有空就做 ${sceneTag.name}`}
              >
                <CloseIcon className="tag-chip__icon" />
              </button>
            </div>
          ))}

          {onCreateSceneTag ? (
            showSceneTagCreator ? (
              <div className="tag-chip tag-chip--creator">
                <input
                  className="tag-chip__input"
                  type="text"
                  value={sceneTagDraft}
                  onChange={(event) => {
                    setSceneTagDraft(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    handleInlineSubmit(event, submitSceneTagDraft)
                  }}
                  placeholder="有空就做"
                  autoFocus
                />
                <span className="tag-chip__divider" aria-hidden="true" />
                <button
                  className="tag-chip__action tag-chip__action--confirm"
                  type="button"
                  onClick={() => {
                    void submitSceneTagDraft()
                  }}
                  disabled={isCreatingSceneTag}
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
                  setSceneTagError(null)
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
            )
          ) : null}
        </div>

        {sceneTagError ? (
          <p className="form-message form-message--danger">{sceneTagError}</p>
        ) : null}
      </div>

      <div className="template-form__row">
        <div className="template-form__inline-field template-form__inline-field--interest">
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

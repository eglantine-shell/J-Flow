import { useState } from 'react'
import type { Dispatch, KeyboardEvent, SetStateAction } from 'react'

import { CheckIcon, CloseIcon, PlusIcon } from '@/components/ui/Icons'
import type { ActivityType, InterestLevel, SceneTag } from '@/types'

export type TaskTemplateFormState = {
  activityTypeId: string
  title: string
  sceneTagIds: string[]
  interestLevel: InterestLevel
}

export type TaskTemplateFormLoadState = {
  sceneTags: SceneTag[]
  activityTypes: ActivityType[]
}

export const interestOptions: Array<{
  label: string
  value: InterestLevel
}> = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
]

export const createInitialTaskTemplateFormState = (): TaskTemplateFormState => ({
  activityTypeId: '',
  title: '',
  sceneTagIds: [],
  interestLevel: 2,
})

export const GRASS_BATCH_MAX_LINES = 20

export function parseGrassBatchTitles(title: string) {
  return title
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function validateTaskTemplateForm(formState: TaskTemplateFormState) {
  const parsedTitles = parseGrassBatchTitles(formState.title)

  return !formState.activityTypeId
    ? '请选择种草清单。'
    : parsedTitles.length === 0
      ? '请填写种草内容。'
      : parsedTitles.length > GRASS_BATCH_MAX_LINES
        ? `一次最多保存 ${GRASS_BATCH_MAX_LINES} 条种草。`
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

  const handleSceneTagToggle = (sceneTagId: string) => {
    setFormState((current) => ({
      ...current,
      sceneTagIds: current.sceneTagIds.includes(sceneTagId)
        ? current.sceneTagIds.filter((id) => id !== sceneTagId)
        : [...current.sceneTagIds, sceneTagId],
    }))
  }

  const handleActivityTypeSelect = (activityTypeId: string) => {
    setFormState((current) => ({
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
      setFormState((current) => ({
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
          rows={4}
          value={formState.title}
          onChange={(event) => {
            setFormState((current) => ({
              ...current,
              title: event.target.value,
            }))
          }}
          placeholder="输入种草内容，每行一条，空行会忽略，最多 20 条"
          aria-label="种草内容"
        />
      </div>

      <div className="template-form__row">
        <div className="template-form__inline-field template-form__inline-field--interest">
          <span>兴趣程度</span>
          <div className="template-form__interest-control">
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
                    setFormState((current) => ({
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
    </div>
  )
}

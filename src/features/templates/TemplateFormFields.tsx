import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

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
  help: string
}> = [
  {
    label: '不重复',
    value: 'none',
    help: '只保存为单条模板，不按日历持续命中。',
  },
  {
    label: '每天',
    value: 'daily',
    help: '日历型重复：从锚点日期开始每天命中。',
  },
  {
    label: '每周',
    value: 'weekly',
    help: '日历型重复：命中锚点对应的星期，不是“每隔一周”。',
  },
  {
    label: '每月',
    value: 'monthly',
    help: '日历型重复：命中锚点对应的日号，不是“每隔一个月”。',
  },
  {
    label: '每年',
    value: 'yearly',
    help: '日历型重复：命中锚点对应的月和日，不是“每隔一年”。',
  },
]

export const createInitialTaskTemplateFormState = (): TaskTemplateFormState => ({
  date: todayDateString(),
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

export function validateTaskTemplateForm(formState: TaskTemplateFormState) {
  return !formState.date
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
  showAdvancedFields,
  setShowAdvancedFields,
  onCreateSceneTag,
  onCreateActivityType,
}: {
  formState: TaskTemplateFormState
  setFormState: Dispatch<SetStateAction<TaskTemplateFormState>>
  loadState: TaskTemplateFormLoadState
  showAdvancedFields: boolean
  setShowAdvancedFields: Dispatch<SetStateAction<boolean>>
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

  const activeRecurrenceOption =
    recurrenceOptions.find((option) => option.value === formState.recurrence) ??
    recurrenceOptions[0]

  const handleSceneTagToggle = (sceneTagId: string) => {
    setFormState((current) => ({
      ...current,
      sceneTagIds: current.sceneTagIds.includes(sceneTagId)
        ? current.sceneTagIds.filter((id) => id !== sceneTagId)
        : [...current.sceneTagIds, sceneTagId],
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

  return (
    <>
      <div className="template-form__section">
        <div className="template-form__section-header">
          <h3>主字段</h3>
          <p>日期是核心字段。当前始终显示，并作为重复规则的日历锚点。</p>
        </div>

        <div className="form-grid">
          <label className="editor-field">
            <span>日期</span>
            <input
              type="date"
              value={formState.date}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }}
            />
          </label>

          <label className="editor-field">
            <span>活动类型</span>
            <select
              value={formState.activityTypeId}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  activityTypeId: event.target.value,
                }))
              }}
            >
              <option value="" disabled>
                请选择活动类型
              </option>
              {loadState.activityTypes.map((activityType) => (
                <option key={activityType.id} value={activityType.id}>
                  {activityType.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {onCreateActivityType ? (
          <div className="inline-creator">
            <button
              className="ghost-button ghost-button--compact"
              type="button"
              onClick={() => {
                setShowActivityTypeCreator((current) => !current)
                setActivityTypeError(null)
              }}
            >
              {showActivityTypeCreator ? '收起新增活动类型' : '现场新增活动类型'}
            </button>

            {showActivityTypeCreator ? (
              <div className="inline-creator__panel">
                <div className="inline-creator__controls">
                  <input
                    className="inline-creator__input"
                    type="text"
                    value={activityTypeDraft}
                    onChange={(event) => {
                      setActivityTypeDraft(event.target.value)
                    }}
                    placeholder="输入新的活动类型名称"
                  />
                  <button
                    className="primary-button"
                    type="button"
                    disabled={isCreatingActivityType}
                    onClick={() => {
                      void submitActivityTypeDraft()
                    }}
                  >
                    {isCreatingActivityType ? '新增中...' : '保存'}
                  </button>
                  <button
                    className="ghost-button ghost-button--compact"
                    type="button"
                    disabled={isCreatingActivityType}
                    onClick={() => {
                      setShowActivityTypeCreator(false)
                      setActivityTypeDraft('')
                      setActivityTypeError(null)
                    }}
                  >
                    取消
                  </button>
                </div>

                {activityTypeError ? (
                  <p className="form-message form-message--danger">{activityTypeError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <label className="editor-field">
          <span>具体内容</span>
          <textarea
            rows={3}
            value={formState.title}
            onChange={(event) => {
              setFormState((current) => ({
                ...current,
                title: event.target.value,
              }))
            }}
            placeholder="例如：读《深度工作》、整理书架、复习英语单词"
          />
        </label>
      </div>

      <div className="template-form__section">
        <div className="template-form__section-header">
          <h3>常用设置</h3>
          <p>时间场景可以为空提交；V1 仅保存模板属性，不在此处做推荐或自动生成。</p>
        </div>

        <div className="editor-field">
          <span>时间场景</span>
          <div className="selection-grid">
            {loadState.sceneTags.map((sceneTag) => (
              <label className="check-tile" key={sceneTag.id}>
                <input
                  type="checkbox"
                  checked={formState.sceneTagIds.includes(sceneTag.id)}
                  onChange={() => {
                    handleSceneTagToggle(sceneTag.id)
                  }}
                />
                <span>{sceneTag.name}</span>
              </label>
            ))}
          </div>
        </div>

        {onCreateSceneTag ? (
          <div className="inline-creator">
            <button
              className="ghost-button ghost-button--compact"
              type="button"
              onClick={() => {
                setShowSceneTagCreator((current) => !current)
                setSceneTagError(null)
              }}
            >
              {showSceneTagCreator ? '收起新增时间场景' : '现场新增时间场景'}
            </button>

            {showSceneTagCreator ? (
              <div className="inline-creator__panel">
                <div className="inline-creator__controls">
                  <input
                    className="inline-creator__input"
                    type="text"
                    value={sceneTagDraft}
                    onChange={(event) => {
                      setSceneTagDraft(event.target.value)
                    }}
                    placeholder="输入新的时间场景名称"
                  />
                  <button
                    className="primary-button"
                    type="button"
                    disabled={isCreatingSceneTag}
                    onClick={() => {
                      void submitSceneTagDraft()
                    }}
                  >
                    {isCreatingSceneTag ? '新增中...' : '保存'}
                  </button>
                  <button
                    className="ghost-button ghost-button--compact"
                    type="button"
                    disabled={isCreatingSceneTag}
                    onClick={() => {
                      setShowSceneTagCreator(false)
                      setSceneTagDraft('')
                      setSceneTagError(null)
                    }}
                  >
                    取消
                  </button>
                </div>

                {sceneTagError ? (
                  <p className="form-message form-message--danger">{sceneTagError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="editor-field">
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

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={formState.isNecessary}
            onChange={(event) => {
              setFormState((current) => ({
                ...current,
                isNecessary: event.target.checked,
              }))
            }}
          />
          <div>
            <strong>必要事项</strong>
            <p>只影响未来自动进入计划与推荐竞争，不回写既有实例。</p>
          </div>
        </label>
      </div>

      <div className="template-form__section">
        <div className="template-form__section-header">
          <h3>高级设置</h3>
          <p>通过开关展开，保持新增与编辑时的字段语义一致。</p>
        </div>

        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            setShowAdvancedFields((current) => !current)
          }}
        >
          {showAdvancedFields ? '收起高级设置' : '展开高级设置'}
        </button>

        {showAdvancedFields ? (
          <div className="advanced-stack">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={formState.requiresPreparation}
                onChange={(event) => {
                  const checked = event.target.checked

                  setFormState((current) => ({
                    ...current,
                    requiresPreparation: checked,
                    preparationNotes: checked ? current.preparationNotes : '',
                  }))
                }}
              />
              <div>
                <strong>需要准备</strong>
                <p>V1 只把它作为提示展示，不参与排序或筛选。</p>
              </div>
            </label>

            {formState.requiresPreparation ? (
              <label className="editor-field">
                <span>准备备注</span>
                <textarea
                  rows={3}
                  value={formState.preparationNotes}
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      preparationNotes: event.target.value,
                    }))
                  }}
                  placeholder="例如：提前腾出 20 分钟，并准备收纳盒。"
                />
              </label>
            ) : null}

            <label className="editor-field">
              <span>重复规则</span>
              <select
                value={formState.recurrence}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    recurrence: event.target.value as RecurrenceRule,
                  }))
                }}
              >
                {recurrenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <p className="form-message">
              {activeRecurrenceOption.help}
              编辑后只影响未来自动生成与未来推荐，不会回写已有实例。
            </p>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={formState.isSegmented}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    isSegmented: event.target.checked,
                  }))
                }}
              />
              <div>
                <strong>分次事项</strong>
                <p>只影响未来实例；已有实例保留原有进度语义。</p>
              </div>
            </label>
          </div>
        ) : null}
      </div>
    </>
  )
}

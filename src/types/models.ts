export type InterestLevel = 1 | 2 | 3

export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type TimeBlock = 'day' | 'night'

export type TimeBlockSource =
  | 'mapped_day'
  | 'default_day'
  | 'mapped_night'
  | 'manual_night'

export type DayPlanItemSource =
  | 'auto_generated'
  | 'decision_selected'
  | 'manual_temporary'

export type DayPlanItemStatus = 'pending' | 'completed' | 'deleted'

export type RecurringInstanceStatus = 'pending' | 'completed' | 'expired'

export type ProgressState = 'not_started' | 'in_progress' | 'completed'

export type TieBreakerOrder = 'asc' | 'desc'

export type ProgressPercent = number

export type RecurrenceDateKey = string

export type DayPlanItemUniquenessKey = `${string}:${TimeBlock}:${string}`

export const PROGRESS_PERCENT_MIN = 0

export const PROGRESS_PERCENT_MAX = 100

export const DAY_PLAN_ITEM_DUPLICATE_SCOPE = 'date + timeBlock + templateId'

export interface SceneTag {
  id: string
  name: string
  createdAt: string
  isBuiltIn: boolean
}

export interface ActivityType {
  id: string
  name: string
  createdAt: string
  isBuiltIn: boolean
}

export interface TaskTemplate {
  id: string
  title: string
  date: string
  activityTypeId: string
  sceneTagIds: string[]
  interestLevel: InterestLevel
  isNecessary: boolean
  requiresPreparation: boolean
  preparationNotes: string
  recurrence: RecurrenceRule
  isSegmented: boolean
  createdAt: string
  updatedAt: string
  isArchived: boolean
}

export interface RecurringTaskInstance {
  id: string
  templateId: string
  dateKey: RecurrenceDateKey
  recurrence: Exclude<RecurrenceRule, 'none'>
  status: RecurringInstanceStatus
  progressState: ProgressState
  progressPercent: ProgressPercent
  progressNote: string
  generatedAt: string
  completedAt?: string
}

export interface DayPlanItem {
  id: string
  date: string
  targetDate?: string
  timeBlock: TimeBlock
  timeBlockSource: TimeBlockSource
  sortOrder: number
  source: DayPlanItemSource
  templateId?: string
  recurringInstanceId?: string
  consumesDateTrigger?: boolean
  title: string
  activityTypeId?: string
  isNecessary: boolean
  requiresPreparation: boolean
  preparationNotes: string
  isSegmented: boolean
  progressState: ProgressState
  progressPercent: ProgressPercent
  status: DayPlanItemStatus
  createdAt: string
  completedAt?: string
}

export interface AppSettings {
  initialized: boolean
  tieBreakerOrder: TieBreakerOrder
  weatherEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RecommendationInput {
  date: string
  timeBlock: TimeBlock
  activityTypeId: string
  sceneTagIds: string[]
}

export interface RecommendationResult {
  recommended: TaskTemplate | null
  candidates: TaskTemplate[]
}

export interface AppData {
  settings: AppSettings
  sceneTags: SceneTag[]
  activityTypes: ActivityType[]
  taskTemplates: TaskTemplate[]
  recurringTaskInstances: RecurringTaskInstance[]
  dayPlanItems: DayPlanItem[]
}

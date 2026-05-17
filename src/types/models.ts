export type InterestLevel = 1 | 2 | 3
export type GrassStatus = 'active' | 'picked' | 'archived'

export type TemplateKind = 'grass' | 'todo_recurring'

export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RepeatType = 'none' | 'calendar' | 'afterCompletion'
export type RepeatIntervalUnit = 'day' | 'week' | 'month' | 'year'

export type RepeatRule = {
  repeatType: RepeatType
  intervalValue?: number
  intervalUnit?: RepeatIntervalUnit
}

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
export type CompletedAtRoundingMinutes = 0 | 5 | 10 | 30
export type LogbookCompletedKind = 'completed' | 'picked'

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
  templateKind: TemplateKind
  title: string
  date: string
  activityTypeId?: string
  sceneTagIds: string[]
  interestLevel: InterestLevel
  isNecessary: boolean
  requiresPreparation: boolean
  preparationNotes: string
  recurrence: RecurrenceRule
  repeatType?: RepeatType
  repeatIntervalUnit?: RepeatIntervalUnit
  repeatIntervalValue?: number
  isSegmented: boolean
  createdAt: string
  updatedAt: string
  grassStatus?: GrassStatus
  isArchived: boolean
}

export interface RecurringTaskInstance {
  id: string
  templateId: string
  dateKey: RecurrenceDateKey
  targetDate?: string
  recurrence: Exclude<RecurrenceRule, 'none'>
  repeatType?: Exclude<RepeatType, 'none'>
  repeatIntervalUnit?: RepeatIntervalUnit
  repeatIntervalValue?: number
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
  originDate?: string
  targetDate?: string
  timeBlock: TimeBlock
  timeBlockSource: TimeBlockSource
  sortOrder: number
  source: DayPlanItemSource
  templateId?: string
  recurringInstanceId?: string
  consumesDateTrigger?: boolean
  rootItemId?: string
  continuationOfItemId?: string
  carriedFromDate?: string
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
  deletedAt?: string
}

export interface LogbookCompletedItem {
  id: string
  titleSnapshot: string
  time: string
  kind: LogbookCompletedKind
  isNecessary: boolean
}

export interface LogbookUnfinishedItem {
  id: string
  titleSnapshot: string
  isNecessary: boolean
  progressPercent?: ProgressPercent
}

export interface LogbookDeletedItem {
  id: string
  titleSnapshot: string
  isNecessary: boolean
}

export interface SegmentedProgressLog {
  date: string
  itemId: string
  titleSnapshot: string
  isNecessary: boolean
  fromProgress: ProgressPercent
  toProgress: ProgressPercent
}

export interface LogbookEntry {
  date: string
  completedItems: LogbookCompletedItem[]
  unfinishedItems: LogbookUnfinishedItem[]
  deletedItems: LogbookDeletedItem[]
  remark: string
  generatedAt: string
}

export interface AppSettings {
  initialized: boolean
  tieBreakerOrder: TieBreakerOrder
  weatherEnabled: boolean
  completedAtRoundingMinutes: CompletedAtRoundingMinutes
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
  logbookEntries: LogbookEntry[]
  segmentedProgressLogs: SegmentedProgressLog[]
}

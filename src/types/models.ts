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
export type LogbookSnapshotStatus = 'completed' | 'pending' | 'deleted'
export type LogbookSnapshotDeadlineStatus = 'none' | 'normal' | 'overdue'
export type SyncEntityType =
  | 'settings'
  | 'sceneTag'
  | 'activityType'
  | 'taskTemplate'
  | 'recurringTaskInstance'
  | 'dayPlanItem'
export type SyncChangeType = 'upsert' | 'delete'

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
  updatedAt: string
  isBuiltIn: boolean
}

export interface ActivityType {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  isBuiltIn: boolean
}

export interface TaskTemplate {
  id: string
  templateKind: TemplateKind
  title: string
  date: string
  deadlineDate?: string
  timeBlock: TimeBlock
  timeBlockSource: TimeBlockSource
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
  isStepped: boolean
  currentStep: string
  nextStep: string
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
  updatedAt: string
  completedAt?: string
}

export interface DayPlanItem {
  id: string
  date: string
  originDate?: string
  targetDate?: string
  deadlineDate?: string
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
  isStepped: boolean
  currentStep: string
  nextStep: string
  stepRootItemId?: string
  previousStepItemId?: string
  progressState: ProgressState
  progressPercent: ProgressPercent
  status: DayPlanItemStatus
  createdAt: string
  updatedAt: string
  completedAt?: string
  deletedAt?: string
}

export interface LogbookSnapshotItem {
  id: string
  status: LogbookSnapshotStatus
  titleSnapshot: string
  time?: string
  isNecessary: boolean
  isPicked: boolean
  isSegmented: boolean
  progressText?: string
  deadlineDate?: string
  deadlineStatus: LogbookSnapshotDeadlineStatus
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
  snapshotItems: LogbookSnapshotItem[]
  remark: string
  generatedAt: string
}

export interface AppSettings {
  initialized: boolean
  tieBreakerOrder: TieBreakerOrder
  weatherEnabled: boolean
  completedAtRoundingMinutes: CompletedAtRoundingMinutes
  defaultNightTodoByTimeEnabled: boolean
  defaultNightTodoStartHour: number
  defaultNightTodoEndHour: number
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

export interface LocalSyncState {
  deviceId: string
  lastSyncedAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
  lastSyncAttemptedAt: string | null
  lastSyncResult: LocalSyncResultSummary | null
  syncTargetPath: string | null
  syncTargetConfig: SyncTargetConfig | null
}

export interface LocalSyncResultSummary {
  status: 'success' | 'partial' | 'failed'
  attemptedAt: string
  backupCreated: boolean
  backupFilePath: string | null
  importResult?: {
    appliedCount: number
    skippedCount: number
    failedCount: number
  }
  exportResult?: {
    exportedCount: number
    failedCount: number
  }
  errors: string[]
  warnings: string[]
}

export interface SyncChange {
  id: string
  entityType: SyncEntityType
  entityId: string
  changeType: SyncChangeType
  changedAt: string
  syncedAt: string | null
  deviceId: string
}

export interface SyncInfoFile {
  syncVersion: number
  createdAt: string
  updatedAt: string
  appName: 'J-Flow'
  minSupportedAppVersion: string
}

export type SyncTargetConfig =
  | {
      type: 'localFolder'
      path: string
    }
  | {
      type: 'oneDriveAppFolder'
      accountId: string
      displayName?: string
    }

export interface SyncDeviceInfoFile {
  syncVersion: number
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  lastSeenAt: string
  lastSyncedAt: string | null
}

export interface SyncTargetTestResult {
  success: boolean
  targetPath: string
  syncVersion: number | null
  deviceId: string
  message: string
  error?: string
}

export interface SyncItemFile<Entity = unknown> {
  syncVersion: number
  entityType: SyncEntityType
  id: string
  updatedAt: string
  deletedAt: null
  deviceId: string
  data: Entity
}

export interface SyncTombstoneFile {
  syncVersion: number
  entityType: SyncEntityType
  id: string
  deletedAt: string
  deviceId: string
}

export interface SyncExportFailure {
  changeId: string
  entityType: SyncEntityType
  entityId: string
  changeType: SyncChangeType
  message: string
}

export interface SyncExportResult {
  success: boolean
  targetPath: string
  deviceId: string
  exportedCount: number
  failedCount: number
  failures: SyncExportFailure[]
}

export interface SyncImportFailure {
  filePath: string
  entityType?: SyncEntityType
  entityId?: string
  message: string
}

export interface SyncImportResult {
  success: boolean
  targetPath: string
  deviceId: string
  appliedCount: number
  skippedCount: number
  failedCount: number
  failures: SyncImportFailure[]
}

export interface SyncNowResult {
  success: boolean
  status: 'success' | 'partial' | 'failed'
  startedAt: string
  completedAt?: string
  targetPath: string | null
  deviceId: string
  backupCreated: boolean
  backupFilePath?: string | null
  importResult?: {
    appliedCount: number
    skippedCount: number
    failedCount: number
  }
  exportResult?: {
    exportedCount: number
    failedCount: number
  }
  lastSyncedAtWritten: boolean
  errors: string[]
  warnings: string[]
}

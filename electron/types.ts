export type InterestLevel = 1 | 2 | 3
export type GrassStatus = 'active' | 'picked' | 'archived'

export type TemplateKind = 'grass' | 'todo_recurring'
export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RepeatType = 'none' | 'calendar' | 'afterCompletion'
export type RepeatIntervalUnit = 'day' | 'week' | 'month' | 'year'
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
export type SyncEntityType =
  | 'settings'
  | 'sceneTag'
  | 'activityType'
  | 'taskTemplate'
  | 'recurringTaskInstance'
  | 'dayPlanItem'
export type SyncChangeType = 'upsert' | 'delete'

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
  dateKey: string
  targetDate?: string
  recurrence: Exclude<RecurrenceRule, 'none'>
  repeatType?: Exclude<RepeatType, 'none'>
  repeatIntervalUnit?: RepeatIntervalUnit
  repeatIntervalValue?: number
  status: RecurringInstanceStatus
  progressState: ProgressState
  progressPercent: number
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
  progressPercent: number
  status: DayPlanItemStatus
  createdAt: string
  updatedAt: string
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
  progressPercent?: number
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
  fromProgress: number
  toProgress: number
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

export type SceneTagUpdateInput = Partial<Omit<SceneTag, 'id'>> & Pick<SceneTag, 'id'>
export type ActivityTypeUpdateInput = Partial<Omit<ActivityType, 'id'>> & Pick<ActivityType, 'id'>
export type TaskTemplateUpdateInput = Partial<Omit<TaskTemplate, 'id'>> & Pick<TaskTemplate, 'id'>
export type RecurringTaskInstanceUpdateInput = Partial<Omit<RecurringTaskInstance, 'id'>> &
  Pick<RecurringTaskInstance, 'id'>
export type DayPlanItemUpdateInput = Partial<Omit<DayPlanItem, 'id'>> & Pick<DayPlanItem, 'id'>
export type AppSettingsUpdateInput = Partial<Omit<AppSettings, 'createdAt' | 'updatedAt'>>

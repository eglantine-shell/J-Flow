import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import type {
  ActivityType,
  ActivityTypeUpdateInput,
  AppData,
  AppSettings,
  AppSettingsUpdateInput,
  DayPlanItem,
  DayPlanItemUpdateInput,
  LocalSyncState,
  LocalSyncResultSummary,
  LogbookEntry,
  LogbookSnapshotItem,
  RecurringTaskInstance,
  RecurringTaskInstanceUpdateInput,
  SceneTag,
  SceneTagUpdateInput,
  SyncChange,
  SyncChangeType,
  SyncEntityType,
  TaskTemplate,
  TaskTemplateUpdateInput,
  SyncTargetConfig,
} from './types.js'

const SQLITE_FILENAME = 'j-flow.sqlite3'
const SQLITE_SCHEMA_VERSION = 4
const SETTINGS_ROW_ID = 1
const META_SQLITE_SCHEMA_VERSION = 'sqlite_schema_version'
const META_APP_DATA_REVISION = 'app_data_revision'
const DEFAULT_COMPLETED_AT_ROUNDING_MINUTES: AppSettings['completedAtRoundingMinutes'] = 5
const SYNC_META_DEVICE_ID = 'deviceId'
const SYNC_META_LAST_SYNCED_AT = 'lastSyncedAt'
const SYNC_META_LAST_SYNC_STATUS = 'lastSyncStatus'
const SYNC_META_LAST_SYNC_ERROR = 'lastSyncError'
const SYNC_META_LAST_SYNC_ATTEMPTED_AT = 'lastSyncAttemptedAt'
const SYNC_META_LAST_SYNC_RESULT = 'lastSyncResult'
const SYNC_META_TARGET_PATH = 'syncTargetPath'
const SYNC_META_TARGET_CONFIG = 'syncTargetConfig'

type SnapshotResult =
  | {
      ok: true
      appData: AppData
      revision: number
      databasePath: string
    }
  | {
      ok: false
      reason: 'conflict'
      revision: number
      databasePath: string
    }

let cachedDatabasePath: string | null = null
let cachedDatabase: DatabaseSync | null = null

const cloneAppData = (appData: AppData): AppData => structuredClone(appData)
const nowIso = () => new Date().toISOString()

const toBoolean = (value: unknown) => Number(value) === 1

const toNullableString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const serializeStringArray = (value: string[]) => JSON.stringify(value)

const parseStringArray = (value: unknown) => {
  if (typeof value !== 'string' || value.length === 0) {
    return []
  }

  const parsed = JSON.parse(value)

  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
}

const parseJsonArray = <Item>(
  value: unknown,
  isItem: (input: unknown) => input is Item,
) => {
  if (typeof value !== 'string' || value.length === 0) {
    return []
  }

  const parsed = JSON.parse(value)

  return Array.isArray(parsed) ? parsed.filter(isItem) : []
}

const serializeJsonArray = <Item>(value: Item[]) => JSON.stringify(value)

const LEGACY_SEGMENTED_ADVANCE_PATTERN = /^推进\s+(.+?)\s+(\d+)%\s*->\s*(\d+)%$/
const LEGACY_SEGMENTED_PROGRESS_PATTERN = /^(.+?)\s+进度：(\d+)%$/

const normalizeLogbookSnapshotItem = (item: LogbookSnapshotItem): LogbookSnapshotItem => {
  const advanceMatch = item.titleSnapshot.match(LEGACY_SEGMENTED_ADVANCE_PATTERN)

  if (advanceMatch) {
    return {
      ...item,
      titleSnapshot: advanceMatch[1]?.trim() ?? item.titleSnapshot,
      isSegmented: true,
      progressText: `已推进 ${advanceMatch[2]}%→${advanceMatch[3]}%`,
    }
  }

  const progressMatch = item.titleSnapshot.match(LEGACY_SEGMENTED_PROGRESS_PATTERN)

  if (progressMatch) {
    return {
      ...item,
      titleSnapshot: progressMatch[1]?.trim() ?? item.titleSnapshot,
      isSegmented: true,
      progressText: `当前进度 ${progressMatch[2]}%`,
    }
  }

  return item
}

const isLegacyLogbookCompletedItem = (value: unknown): value is {
  id: string
  titleSnapshot: string
  time: string
  kind: 'completed' | 'picked'
  isNecessary: boolean
} => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.titleSnapshot === 'string' &&
    typeof candidate.time === 'string' &&
    (candidate.kind === 'completed' || candidate.kind === 'picked') &&
    typeof candidate.isNecessary === 'boolean'
  )
}

const isLegacyLogbookUnfinishedItem = (value: unknown): value is {
  id: string
  titleSnapshot: string
  isNecessary: boolean
  progressPercent?: number
} => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.titleSnapshot === 'string' &&
    typeof candidate.isNecessary === 'boolean' &&
    (candidate.progressPercent === undefined || typeof candidate.progressPercent === 'number')
  )
}

const isLegacyLogbookDeletedItem = (value: unknown): value is {
  id: string
  titleSnapshot: string
  isNecessary: boolean
} => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.titleSnapshot === 'string' &&
    typeof candidate.isNecessary === 'boolean'
  )
}

const isLogbookSnapshotItem = (value: unknown): value is LogbookSnapshotItem => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    (candidate.status === 'completed' || candidate.status === 'pending' || candidate.status === 'deleted') &&
    typeof candidate.titleSnapshot === 'string' &&
    (candidate.time === undefined || typeof candidate.time === 'string') &&
    typeof candidate.isNecessary === 'boolean' &&
    typeof candidate.isPicked === 'boolean' &&
    typeof candidate.isSegmented === 'boolean' &&
    (candidate.progressText === undefined || typeof candidate.progressText === 'string') &&
    (candidate.deadlineDate === undefined || typeof candidate.deadlineDate === 'string') &&
    (candidate.deadlineStatus === 'none' ||
      candidate.deadlineStatus === 'normal' ||
      candidate.deadlineStatus === 'overdue')
  )
}

const getDatabasePath = (dataPath: string) => path.join(dataPath, SQLITE_FILENAME)

export const getSqliteDatabasePath = (dataPath: string) => getDatabasePath(dataPath)

const getDatabase = (dataPath: string) => {
  const databasePath = getDatabasePath(dataPath)

  if (!cachedDatabase || cachedDatabasePath !== databasePath) {
    cachedDatabase?.close()
    cachedDatabase = new DatabaseSync(databasePath)
    cachedDatabasePath = databasePath

    cachedDatabase.exec('PRAGMA journal_mode = WAL;')
    cachedDatabase.exec('PRAGMA synchronous = NORMAL;')
    ensureSchema(cachedDatabase)
  }

  return cachedDatabase
}

const ensureSchema = (database: DatabaseSync) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      initialized INTEGER NOT NULL,
      tie_breaker_order TEXT NOT NULL,
      weather_enabled INTEGER NOT NULL,
      completed_time_rounding_minutes INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scene_tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_built_in INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_built_in INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_templates (
      id TEXT PRIMARY KEY,
      template_kind TEXT NOT NULL,
      title TEXT NOT NULL,
      date_value TEXT NOT NULL,
      deadline_date TEXT,
      activity_type_id TEXT,
      scene_tag_ids_json TEXT NOT NULL,
      interest_level INTEGER NOT NULL,
      is_necessary INTEGER NOT NULL,
      requires_preparation INTEGER NOT NULL,
      preparation_notes TEXT NOT NULL,
      recurrence TEXT NOT NULL,
      repeat_type TEXT,
      repeat_interval_unit TEXT,
      repeat_interval_value INTEGER,
      is_segmented INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      grass_status TEXT,
      is_archived INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_task_instances (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      target_date TEXT,
      recurrence TEXT NOT NULL,
      repeat_type TEXT,
      repeat_interval_unit TEXT,
      repeat_interval_value INTEGER,
      status TEXT NOT NULL,
      progress_state TEXT NOT NULL,
      progress_percent REAL NOT NULL,
      progress_note TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS day_plan_items (
      id TEXT PRIMARY KEY,
      date_value TEXT NOT NULL,
      origin_date TEXT,
      target_date TEXT,
      deadline_date TEXT,
      time_block TEXT NOT NULL,
      time_block_source TEXT NOT NULL,
      sort_order REAL NOT NULL,
      source TEXT NOT NULL,
      template_id TEXT,
      recurring_instance_id TEXT,
      consumes_date_trigger INTEGER,
      root_item_id TEXT,
      continuation_of_item_id TEXT,
      carried_from_date TEXT,
      title TEXT NOT NULL,
      activity_type_id TEXT,
      is_necessary INTEGER NOT NULL,
      requires_preparation INTEGER NOT NULL,
      preparation_notes TEXT NOT NULL,
      is_segmented INTEGER NOT NULL,
      progress_state TEXT NOT NULL,
      progress_percent REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_changes (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      change_type TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      synced_at TEXT,
      device_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logbook_entries (
      date_value TEXT PRIMARY KEY,
      snapshot_items_json TEXT NOT NULL DEFAULT '[]',
      completed_items_json TEXT NOT NULL,
      unfinished_items_json TEXT NOT NULL,
      deleted_items_json TEXT NOT NULL,
      remark TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS segmented_progress_logs (
      date_value TEXT NOT NULL,
      item_id TEXT NOT NULL,
      title_snapshot TEXT NOT NULL,
      is_necessary INTEGER NOT NULL,
      from_progress REAL NOT NULL,
      to_progress REAL NOT NULL,
      PRIMARY KEY (date_value, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_task_templates_kind_status
      ON task_templates (template_kind, grass_status, is_archived);
    CREATE INDEX IF NOT EXISTS idx_recurring_task_instances_template
      ON recurring_task_instances (template_id, date_key);
    CREATE INDEX IF NOT EXISTS idx_day_plan_items_date_status
      ON day_plan_items (date_value, status, time_block);
    CREATE INDEX IF NOT EXISTS idx_sync_changes_synced_at
      ON sync_changes (synced_at, changed_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_changes_entity
      ON sync_changes (entity_type, entity_id);
  `)

  writeMeta(database, META_SQLITE_SCHEMA_VERSION, String(SQLITE_SCHEMA_VERSION))

  if (readRevision(database) < 0) {
    writeMeta(database, META_APP_DATA_REVISION, '0')
  }

  const dayPlanItemColumns = database
    .prepare('PRAGMA table_info(day_plan_items)')
    .all() as Array<{ name?: unknown }>
  const taskTemplateColumns = database
    .prepare('PRAGMA table_info(task_templates)')
    .all() as Array<{ name?: unknown }>
  const logbookEntryColumns = database
    .prepare('PRAGMA table_info(logbook_entries)')
    .all() as Array<{ name?: unknown }>

  const sceneTagColumns = database
    .prepare('PRAGMA table_info(scene_tags)')
    .all() as Array<{ name?: unknown }>
  const activityTypeColumns = database
    .prepare('PRAGMA table_info(activity_types)')
    .all() as Array<{ name?: unknown }>
  const recurringTaskInstanceColumns = database
    .prepare('PRAGMA table_info(recurring_task_instances)')
    .all() as Array<{ name?: unknown }>

  if (!dayPlanItemColumns.some((column) => column.name === 'deleted_at')) {
    database.exec(`
      ALTER TABLE day_plan_items
      ADD COLUMN deleted_at TEXT;
    `)
  }

  if (!dayPlanItemColumns.some((column) => column.name === 'deadline_date')) {
    database.exec(`
      ALTER TABLE day_plan_items
      ADD COLUMN deadline_date TEXT;
    `)
  }

  if (!taskTemplateColumns.some((column) => column.name === 'deadline_date')) {
    database.exec(`
      ALTER TABLE task_templates
      ADD COLUMN deadline_date TEXT;
    `)
  }

  if (!logbookEntryColumns.some((column) => column.name === 'snapshot_items_json')) {
    database.exec(`
      ALTER TABLE logbook_entries
      ADD COLUMN snapshot_items_json TEXT NOT NULL DEFAULT '[]';
    `)
  }

  if (!sceneTagColumns.some((column) => column.name === 'updated_at')) {
    database.exec(`
      ALTER TABLE scene_tags
      ADD COLUMN updated_at TEXT;
    `)
    database.exec(`
      UPDATE scene_tags
      SET updated_at = created_at
      WHERE updated_at IS NULL OR updated_at = '';
    `)
  }

  if (!activityTypeColumns.some((column) => column.name === 'updated_at')) {
    database.exec(`
      ALTER TABLE activity_types
      ADD COLUMN updated_at TEXT;
    `)
    database.exec(`
      UPDATE activity_types
      SET updated_at = created_at
      WHERE updated_at IS NULL OR updated_at = '';
    `)
  }

  if (!recurringTaskInstanceColumns.some((column) => column.name === 'updated_at')) {
    database.exec(`
      ALTER TABLE recurring_task_instances
      ADD COLUMN updated_at TEXT;
    `)
    database.exec(`
      UPDATE recurring_task_instances
      SET updated_at = COALESCE(completed_at, generated_at)
      WHERE updated_at IS NULL OR updated_at = '';
    `)
  }

  if (!dayPlanItemColumns.some((column) => column.name === 'updated_at')) {
    database.exec(`
      ALTER TABLE day_plan_items
      ADD COLUMN updated_at TEXT;
    `)
    database.exec(`
      UPDATE day_plan_items
      SET updated_at = COALESCE(deleted_at, completed_at, created_at)
      WHERE updated_at IS NULL OR updated_at = '';
    `)
  }

  ensureSyncMetaDefaults(database)
}

const readMeta = (database: DatabaseSync, key: string) => {
  const row = database
    .prepare('SELECT value FROM meta WHERE key = ?')
    .get(key) as { value: string } | undefined

  return row?.value ?? null
}

const writeMeta = (database: DatabaseSync, key: string, value: string) => {
  database
    .prepare(`
      INSERT INTO meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    .run(key, value)
}

const readSyncMeta = (database: DatabaseSync, key: string) => {
  const row = database
    .prepare('SELECT value FROM sync_meta WHERE key = ?')
    .get(key) as { value: string | null } | undefined

  return row?.value ?? null
}

const readSyncMetaJson = <Value>(database: DatabaseSync, key: string): Value | null => {
  const value = readSyncMeta(database, key)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as Value
  } catch {
    return null
  }
}

const writeSyncMeta = (database: DatabaseSync, key: string, value: string | null) => {
  database
    .prepare(`
      INSERT INTO sync_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    .run(key, value)
}

const ensureSyncMetaDefaults = (database: DatabaseSync) => {
  if (!readSyncMeta(database, SYNC_META_DEVICE_ID)) {
    writeSyncMeta(database, SYNC_META_DEVICE_ID, randomUUID())
  }

  if (readSyncMeta(database, SYNC_META_LAST_SYNCED_AT) === null) {
    writeSyncMeta(database, SYNC_META_LAST_SYNCED_AT, null)
  }

  if (readSyncMeta(database, SYNC_META_LAST_SYNC_STATUS) === null) {
    writeSyncMeta(database, SYNC_META_LAST_SYNC_STATUS, null)
  }

  if (readSyncMeta(database, SYNC_META_LAST_SYNC_ERROR) === null) {
    writeSyncMeta(database, SYNC_META_LAST_SYNC_ERROR, null)
  }

  if (readSyncMeta(database, SYNC_META_LAST_SYNC_ATTEMPTED_AT) === null) {
    writeSyncMeta(database, SYNC_META_LAST_SYNC_ATTEMPTED_AT, null)
  }

  if (readSyncMeta(database, SYNC_META_LAST_SYNC_RESULT) === null) {
    writeSyncMeta(database, SYNC_META_LAST_SYNC_RESULT, null)
  }

  if (readSyncMeta(database, SYNC_META_TARGET_PATH) === null) {
    writeSyncMeta(database, SYNC_META_TARGET_PATH, null)
  }

  if (readSyncMeta(database, SYNC_META_TARGET_CONFIG) === null) {
    writeSyncMeta(database, SYNC_META_TARGET_CONFIG, null)
  }
}

const getDeviceId = (database: DatabaseSync) => {
  const deviceId = readSyncMeta(database, SYNC_META_DEVICE_ID)

  if (deviceId) {
    return deviceId
  }

  const nextDeviceId = randomUUID()
  writeSyncMeta(database, SYNC_META_DEVICE_ID, nextDeviceId)

  return nextDeviceId
}

const normalizeSyncTargetConfig = (value: SyncTargetConfig | null): SyncTargetConfig | null => {
  if (!value) {
    return null
  }

  if (value.type === 'localFolder') {
    return value
  }

  return null
}

const buildLocalSyncState = (database: DatabaseSync): LocalSyncState => ({
  deviceId: getDeviceId(database),
  lastSyncedAt: readSyncMeta(database, SYNC_META_LAST_SYNCED_AT),
  lastSyncStatus: readSyncMeta(database, SYNC_META_LAST_SYNC_STATUS),
  lastSyncError: readSyncMeta(database, SYNC_META_LAST_SYNC_ERROR),
  lastSyncAttemptedAt: readSyncMeta(database, SYNC_META_LAST_SYNC_ATTEMPTED_AT),
  lastSyncResult: readSyncMetaJson<LocalSyncResultSummary>(database, SYNC_META_LAST_SYNC_RESULT),
  syncTargetPath: readSyncMeta(database, SYNC_META_TARGET_PATH),
  syncTargetConfig: normalizeSyncTargetConfig(
    readSyncMetaJson<SyncTargetConfig>(database, SYNC_META_TARGET_CONFIG),
  ),
})

const buildSyncChangeId = (entityType: SyncEntityType, entityId: string) =>
  `${entityType}:${entityId}`

const writeSyncChangeState = (
  database: DatabaseSync,
  input: {
    entityType: SyncEntityType
    entityId: string
    changeType: SyncChangeType
    changedAt: string
    syncedAt: string | null
  },
) => {
  const deviceId = getDeviceId(database)

  database
    .prepare(`
      INSERT INTO sync_changes (
        id, entity_type, entity_id, change_type, changed_at, synced_at, device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        change_type = excluded.change_type,
        changed_at = excluded.changed_at,
        synced_at = excluded.synced_at,
        device_id = excluded.device_id
    `)
    .run(
      buildSyncChangeId(input.entityType, input.entityId),
      input.entityType,
      input.entityId,
      input.changeType,
      input.changedAt,
      input.syncedAt,
      deviceId,
    )
}

const queueSnapshotSyncChanges = (database: DatabaseSync, appData: AppData) => {
  resetSyncChanges(database)

  recordSyncChange(database, {
    entityType: 'settings',
    entityId: 'app-settings',
    changeType: 'upsert',
    changedAt: appData.settings.updatedAt,
  })

  for (const sceneTag of appData.sceneTags) {
    recordSyncChange(database, {
      entityType: 'sceneTag',
      entityId: sceneTag.id,
      changeType: 'upsert',
      changedAt: sceneTag.updatedAt,
    })
  }

  for (const activityType of appData.activityTypes) {
    recordSyncChange(database, {
      entityType: 'activityType',
      entityId: activityType.id,
      changeType: 'upsert',
      changedAt: activityType.updatedAt,
    })
  }

  for (const template of appData.taskTemplates) {
    recordSyncChange(database, {
      entityType: 'taskTemplate',
      entityId: template.id,
      changeType: 'upsert',
      changedAt: template.updatedAt,
    })
  }

  for (const instance of appData.recurringTaskInstances) {
    recordSyncChange(database, {
      entityType: 'recurringTaskInstance',
      entityId: instance.id,
      changeType: 'upsert',
      changedAt: instance.updatedAt,
    })
  }

  for (const item of appData.dayPlanItems) {
    recordSyncChange(database, {
      entityType: 'dayPlanItem',
      entityId: item.id,
      changeType: item.status === 'deleted' ? 'delete' : 'upsert',
      changedAt: item.deletedAt || item.updatedAt,
    })
  }
}

const recordSyncChange = (
  database: DatabaseSync,
  input: {
    entityType: SyncEntityType
    entityId: string
    changeType: SyncChangeType
    changedAt: string
  },
) => {
  writeSyncChangeState(database, {
    ...input,
    syncedAt: null,
  })
}

const resetSyncChanges = (database: DatabaseSync) => {
  database.exec('DELETE FROM sync_changes;')
}

const mapSyncChangeRow = (row: Record<string, unknown>): SyncChange => ({
  id: row.id as string,
  entityType: row.entity_type as SyncEntityType,
  entityId: row.entity_id as string,
  changeType: row.change_type as SyncChangeType,
  changedAt: row.changed_at as string,
  syncedAt: toNullableString(row.synced_at) ?? null,
  deviceId: row.device_id as string,
})

const readRevision = (database: DatabaseSync) => {
  const revision = readMeta(database, META_APP_DATA_REVISION)

  return revision ? Number(revision) : -1
}

const runMutation = <Result>(
  database: DatabaseSync,
  mutate: () => Result,
) => {
  database.exec('BEGIN IMMEDIATE')

  try {
    const result = mutate()
    const nextRevision = Math.max(readRevision(database), 0) + 1

    writeMeta(database, META_APP_DATA_REVISION, String(nextRevision))
    writeMeta(database, META_SQLITE_SCHEMA_VERSION, String(SQLITE_SCHEMA_VERSION))
    database.exec('COMMIT')

    return result
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

const runSyncMetaMutation = <Result>(database: DatabaseSync, mutate: () => Result) => {
  database.exec('BEGIN IMMEDIATE')

  try {
    const result = mutate()
    database.exec('COMMIT')
    return result
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

const mapSettingsRow = (row: Record<string, unknown>): AppSettings => ({
  initialized: toBoolean(row.initialized),
  tieBreakerOrder: row.tie_breaker_order as AppSettings['tieBreakerOrder'],
  weatherEnabled: toBoolean(row.weather_enabled),
  completedAtRoundingMinutes:
    (row.completed_time_rounding_minutes as AppSettings['completedAtRoundingMinutes'] | undefined) ??
    DEFAULT_COMPLETED_AT_ROUNDING_MINUTES,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
})

const mapTemplateRow = (row: Record<string, unknown>): TaskTemplate => ({
  id: row.id as string,
  templateKind: row.template_kind as TaskTemplate['templateKind'],
  title: row.title as string,
  date: row.date_value as string,
  deadlineDate: toNullableString(row.deadline_date),
  activityTypeId: toNullableString(row.activity_type_id),
  sceneTagIds: parseStringArray(row.scene_tag_ids_json),
  interestLevel: row.interest_level as TaskTemplate['interestLevel'],
  isNecessary: toBoolean(row.is_necessary),
  requiresPreparation: toBoolean(row.requires_preparation),
  preparationNotes: row.preparation_notes as string,
  recurrence: row.recurrence as TaskTemplate['recurrence'],
  repeatType: toNullableString(row.repeat_type) as TaskTemplate['repeatType'],
  repeatIntervalUnit: toNullableString(row.repeat_interval_unit) as TaskTemplate['repeatIntervalUnit'],
  repeatIntervalValue:
    row.repeat_interval_value === null || row.repeat_interval_value === undefined
      ? undefined
      : Number(row.repeat_interval_value),
  isSegmented: toBoolean(row.is_segmented),
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  grassStatus: toNullableString(row.grass_status) as TaskTemplate['grassStatus'],
  isArchived: toBoolean(row.is_archived),
})

const mapRecurringInstanceRow = (row: Record<string, unknown>): RecurringTaskInstance => ({
  id: row.id as string,
  templateId: row.template_id as string,
  dateKey: row.date_key as string,
  targetDate: toNullableString(row.target_date),
  recurrence: row.recurrence as RecurringTaskInstance['recurrence'],
  repeatType: toNullableString(row.repeat_type) as RecurringTaskInstance['repeatType'],
  repeatIntervalUnit:
    toNullableString(row.repeat_interval_unit) as RecurringTaskInstance['repeatIntervalUnit'],
  repeatIntervalValue:
    row.repeat_interval_value === null || row.repeat_interval_value === undefined
      ? undefined
      : Number(row.repeat_interval_value),
  status: row.status as RecurringTaskInstance['status'],
  progressState: row.progress_state as RecurringTaskInstance['progressState'],
  progressPercent: Number(row.progress_percent),
  progressNote: row.progress_note as string,
  generatedAt: row.generated_at as string,
  updatedAt: row.updated_at as string,
  completedAt: toNullableString(row.completed_at),
})

const mapDayPlanItemRow = (row: Record<string, unknown>): DayPlanItem => ({
  id: row.id as string,
  date: row.date_value as string,
  originDate: toNullableString(row.origin_date),
  targetDate: toNullableString(row.target_date),
  deadlineDate: toNullableString(row.deadline_date),
  timeBlock: row.time_block as DayPlanItem['timeBlock'],
  timeBlockSource: row.time_block_source as DayPlanItem['timeBlockSource'],
  sortOrder: Number(row.sort_order),
  source: row.source as DayPlanItem['source'],
  templateId: toNullableString(row.template_id),
  recurringInstanceId: toNullableString(row.recurring_instance_id),
  consumesDateTrigger:
    row.consumes_date_trigger === null || row.consumes_date_trigger === undefined
      ? undefined
      : toBoolean(row.consumes_date_trigger),
  rootItemId: toNullableString(row.root_item_id),
  continuationOfItemId: toNullableString(row.continuation_of_item_id),
  carriedFromDate: toNullableString(row.carried_from_date),
  title: row.title as string,
  activityTypeId: toNullableString(row.activity_type_id),
  isNecessary: toBoolean(row.is_necessary),
  requiresPreparation: toBoolean(row.requires_preparation),
  preparationNotes: row.preparation_notes as string,
  isSegmented: toBoolean(row.is_segmented),
  progressState: row.progress_state as DayPlanItem['progressState'],
  progressPercent: Number(row.progress_percent),
  status: row.status as DayPlanItem['status'],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  completedAt: toNullableString(row.completed_at),
  deletedAt: toNullableString(row.deleted_at),
})

const mapLogbookEntryRow = (row: Record<string, unknown>): LogbookEntry => ({
  date: row.date_value as string,
  snapshotItems: (() => {
    const snapshotItems = parseJsonArray(row.snapshot_items_json, isLogbookSnapshotItem)

    if (snapshotItems.length > 0) {
      return snapshotItems.map((item) => normalizeLogbookSnapshotItem(item))
    }

    const completedItems = parseJsonArray(row.completed_items_json, isLegacyLogbookCompletedItem)
    const unfinishedItems = parseJsonArray(row.unfinished_items_json, isLegacyLogbookUnfinishedItem)
    const deletedItems = parseJsonArray(row.deleted_items_json, isLegacyLogbookDeletedItem)

    return [
      ...completedItems.map((item) => ({
        id: item.id,
        status: 'completed' as const,
        titleSnapshot: item.titleSnapshot,
        time: item.time.replace(':', '').replace('：', ''),
        isNecessary: item.isNecessary,
        isPicked: item.kind === 'picked',
        isSegmented: false,
        deadlineStatus: 'none' as const,
      })),
      ...unfinishedItems
        .map((item) => ({
          id: item.id,
          status: 'pending' as const,
          titleSnapshot: item.titleSnapshot,
          isNecessary: item.isNecessary,
          isPicked: false,
          isSegmented: false,
          deadlineStatus: 'none' as const,
        }))
        .map((item) => normalizeLogbookSnapshotItem(item)),
      ...deletedItems.map((item) => ({
        id: item.id,
        status: 'deleted' as const,
        titleSnapshot: item.titleSnapshot,
        isNecessary: item.isNecessary,
        isPicked: false,
        isSegmented: false,
        deadlineStatus: 'none' as const,
      })),
    ]
  })(),
  remark: row.remark as string,
  generatedAt: row.generated_at as string,
})

const getPersistedSnapshotItems = (entry: LogbookEntry) => {
  if (Array.isArray((entry as { snapshotItems?: unknown }).snapshotItems)) {
    return ((entry as { snapshotItems: LogbookSnapshotItem[] }).snapshotItems ?? []).map((item) =>
      normalizeLogbookSnapshotItem(item),
    )
  }

  const legacyEntry = entry as LogbookEntry & {
    completedItems?: Array<{
      id: string
      titleSnapshot: string
      time: string
      kind: 'completed' | 'picked'
      isNecessary: boolean
    }>
    unfinishedItems?: Array<{
      id: string
      titleSnapshot: string
      isNecessary: boolean
    }>
    deletedItems?: Array<{
      id: string
      titleSnapshot: string
      isNecessary: boolean
    }>
  }

  return [
    ...(legacyEntry.completedItems ?? []).map((item) => ({
      id: item.id,
      status: 'completed' as const,
      titleSnapshot: item.titleSnapshot,
      time: item.time.replace(':', '').replace('：', ''),
      isNecessary: item.isNecessary,
      isPicked: item.kind === 'picked',
      isSegmented: false,
      deadlineStatus: 'none' as const,
    })),
    ...(legacyEntry.unfinishedItems ?? [])
      .map((item) => ({
        id: item.id,
        status: 'pending' as const,
        titleSnapshot: item.titleSnapshot,
        isNecessary: item.isNecessary,
        isPicked: false,
        isSegmented: false,
        deadlineStatus: 'none' as const,
      }))
      .map((item) => normalizeLogbookSnapshotItem(item)),
    ...(legacyEntry.deletedItems ?? []).map((item) => ({
      id: item.id,
      status: 'deleted' as const,
      titleSnapshot: item.titleSnapshot,
      isNecessary: item.isNecessary,
      isPicked: false,
      isSegmented: false,
      deadlineStatus: 'none' as const,
    })),
  ]
}

const readAppData = (database: DatabaseSync): AppData | null => {
  const settingsRow = database
    .prepare('SELECT * FROM settings WHERE id = ?')
    .get(SETTINGS_ROW_ID) as Record<string, unknown> | undefined

  if (!settingsRow) {
    return null
  }

  const sceneTags = database
    .prepare('SELECT * FROM scene_tags ORDER BY created_at ASC')
    .all() as Array<Record<string, unknown>>
  const activityTypes = database
    .prepare('SELECT * FROM activity_types ORDER BY created_at ASC')
    .all() as Array<Record<string, unknown>>
  const taskTemplates = database
    .prepare('SELECT * FROM task_templates ORDER BY updated_at DESC')
    .all() as Array<Record<string, unknown>>
  const recurringTaskInstances = database
    .prepare('SELECT * FROM recurring_task_instances ORDER BY generated_at ASC')
    .all() as Array<Record<string, unknown>>
  const dayPlanItems = database
    .prepare('SELECT * FROM day_plan_items ORDER BY created_at ASC')
    .all() as Array<Record<string, unknown>>
  const logbookEntries = database
    .prepare('SELECT * FROM logbook_entries ORDER BY date_value DESC')
    .all() as Array<Record<string, unknown>>
  const segmentedProgressLogs = database
    .prepare('SELECT * FROM segmented_progress_logs ORDER BY date_value DESC, item_id ASC')
    .all() as Array<Record<string, unknown>>

  return {
    settings: mapSettingsRow(settingsRow),
    sceneTags: sceneTags.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      isBuiltIn: toBoolean(row.is_built_in),
    })),
    activityTypes: activityTypes.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      isBuiltIn: toBoolean(row.is_built_in),
    })),
    taskTemplates: taskTemplates.map(mapTemplateRow),
    recurringTaskInstances: recurringTaskInstances.map(mapRecurringInstanceRow),
    dayPlanItems: dayPlanItems.map(mapDayPlanItemRow),
    logbookEntries: logbookEntries.map(mapLogbookEntryRow),
    segmentedProgressLogs: segmentedProgressLogs.map((row) => ({
      date: row.date_value as string,
      itemId: row.item_id as string,
      titleSnapshot: row.title_snapshot as string,
      isNecessary: toBoolean(row.is_necessary),
      fromProgress: Number(row.from_progress),
      toProgress: Number(row.to_progress),
    })),
  }
}

const clearAppData = (database: DatabaseSync) => {
  database.exec(`
    DELETE FROM segmented_progress_logs;
    DELETE FROM logbook_entries;
    DELETE FROM day_plan_items;
    DELETE FROM recurring_task_instances;
    DELETE FROM task_templates;
    DELETE FROM activity_types;
    DELETE FROM scene_tags;
    DELETE FROM settings;
  `)

  const settingsColumns = database
    .prepare('PRAGMA table_info(settings)')
    .all() as Array<{ name?: unknown }>

  if (!settingsColumns.some((column) => column.name === 'completed_time_rounding_minutes')) {
    database.exec(`
      ALTER TABLE settings
      ADD COLUMN completed_time_rounding_minutes INTEGER NOT NULL DEFAULT 5;
    `)
  }
}

const insertAppData = (database: DatabaseSync, appData: AppData) => {
  database
    .prepare(`
      INSERT INTO settings (
        id, initialized, tie_breaker_order, weather_enabled,
        completed_time_rounding_minutes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      SETTINGS_ROW_ID,
      appData.settings.initialized ? 1 : 0,
      appData.settings.tieBreakerOrder,
      appData.settings.weatherEnabled ? 1 : 0,
      appData.settings.completedAtRoundingMinutes,
      appData.settings.createdAt,
      appData.settings.updatedAt,
    )

  const insertSceneTag = database.prepare(`
    INSERT INTO scene_tags (id, name, created_at, updated_at, is_built_in)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertActivityType = database.prepare(`
    INSERT INTO activity_types (id, name, created_at, updated_at, is_built_in)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertTaskTemplate = database.prepare(`
    INSERT INTO task_templates (
      id, template_kind, title, date_value, deadline_date, activity_type_id, scene_tag_ids_json,
      interest_level, is_necessary, requires_preparation, preparation_notes,
      recurrence, repeat_type, repeat_interval_unit, repeat_interval_value,
      is_segmented, created_at, updated_at, grass_status, is_archived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertRecurringTaskInstance = database.prepare(`
    INSERT INTO recurring_task_instances (
      id, template_id, date_key, target_date, recurrence, repeat_type,
      repeat_interval_unit, repeat_interval_value, status, progress_state,
      progress_percent, progress_note, generated_at, updated_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertDayPlanItem = database.prepare(`
    INSERT INTO day_plan_items (
      id, date_value, origin_date, target_date, deadline_date, time_block, time_block_source,
      sort_order, source, template_id, recurring_instance_id, consumes_date_trigger,
      root_item_id, continuation_of_item_id, carried_from_date, title, activity_type_id,
      is_necessary, requires_preparation, preparation_notes, is_segmented,
      progress_state, progress_percent, status, created_at, updated_at, completed_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertLogbookEntry = database.prepare(`
    INSERT INTO logbook_entries (
      date_value, snapshot_items_json, completed_items_json, unfinished_items_json, deleted_items_json, remark, generated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const insertSegmentedProgressLog = database.prepare(`
    INSERT INTO segmented_progress_logs (
      date_value, item_id, title_snapshot, is_necessary, from_progress, to_progress
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const sceneTag of appData.sceneTags) {
    insertSceneTag.run(
      sceneTag.id,
      sceneTag.name,
      sceneTag.createdAt,
      sceneTag.updatedAt,
      sceneTag.isBuiltIn ? 1 : 0,
    )
  }

  for (const activityType of appData.activityTypes) {
    insertActivityType.run(
      activityType.id,
      activityType.name,
      activityType.createdAt,
      activityType.updatedAt,
      activityType.isBuiltIn ? 1 : 0,
    )
  }

  for (const template of appData.taskTemplates) {
    insertTaskTemplate.run(
      template.id,
      template.templateKind,
      template.title,
      template.date,
      template.deadlineDate ?? null,
      template.activityTypeId ?? null,
      serializeStringArray(template.sceneTagIds),
      template.interestLevel,
      template.isNecessary ? 1 : 0,
      template.requiresPreparation ? 1 : 0,
      template.preparationNotes,
      template.recurrence,
      template.repeatType ?? null,
      template.repeatIntervalUnit ?? null,
      template.repeatIntervalValue ?? null,
      template.isSegmented ? 1 : 0,
      template.createdAt,
      template.updatedAt,
      template.grassStatus ?? null,
      template.isArchived ? 1 : 0,
    )
  }

  for (const instance of appData.recurringTaskInstances) {
    insertRecurringTaskInstance.run(
      instance.id,
      instance.templateId,
      instance.dateKey,
      instance.targetDate ?? null,
      instance.recurrence,
      instance.repeatType ?? null,
      instance.repeatIntervalUnit ?? null,
      instance.repeatIntervalValue ?? null,
      instance.status,
      instance.progressState,
      instance.progressPercent,
      instance.progressNote,
      instance.generatedAt,
      instance.updatedAt,
      instance.completedAt ?? null,
    )
  }

  for (const item of appData.dayPlanItems) {
    insertDayPlanItem.run(
      item.id,
      item.date,
      item.originDate ?? null,
      item.targetDate ?? null,
      item.deadlineDate ?? null,
      item.timeBlock,
      item.timeBlockSource,
      item.sortOrder,
      item.source,
      item.templateId ?? null,
      item.recurringInstanceId ?? null,
      item.consumesDateTrigger === undefined ? null : item.consumesDateTrigger ? 1 : 0,
      item.rootItemId ?? null,
      item.continuationOfItemId ?? null,
      item.carriedFromDate ?? null,
      item.title,
      item.activityTypeId ?? null,
      item.isNecessary ? 1 : 0,
      item.requiresPreparation ? 1 : 0,
      item.preparationNotes,
      item.isSegmented ? 1 : 0,
      item.progressState,
      item.progressPercent,
      item.status,
      item.createdAt,
      item.updatedAt,
      item.completedAt ?? null,
      item.deletedAt ?? null,
    )
  }

  for (const entry of appData.logbookEntries) {
    const snapshotItems = getPersistedSnapshotItems(entry)

    insertLogbookEntry.run(
      entry.date,
      serializeJsonArray(snapshotItems),
      '[]',
      '[]',
      '[]',
      entry.remark,
      entry.generatedAt,
    )
  }

  for (const log of appData.segmentedProgressLogs) {
    insertSegmentedProgressLog.run(
      log.date,
      log.itemId,
      log.titleSnapshot,
      log.isNecessary ? 1 : 0,
      log.fromProgress,
      log.toProgress,
    )
  }
}

const listSceneTags = (database: DatabaseSync) =>
  (
    database.prepare('SELECT * FROM scene_tags ORDER BY created_at ASC').all() as Array<
      Record<string, unknown>
    >
  ).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isBuiltIn: toBoolean(row.is_built_in),
  }))

const getSceneTagById = (database: DatabaseSync, id: string) => {
  const row = database.prepare('SELECT * FROM scene_tags WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined

  return row
    ? {
        id: row.id as string,
        name: row.name as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        isBuiltIn: toBoolean(row.is_built_in),
      }
    : null
}

const listActivityTypes = (database: DatabaseSync) =>
  (
    database.prepare('SELECT * FROM activity_types ORDER BY created_at ASC').all() as Array<
      Record<string, unknown>
    >
  ).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isBuiltIn: toBoolean(row.is_built_in),
  }))

const getActivityTypeById = (database: DatabaseSync, id: string) => {
  const row = database.prepare('SELECT * FROM activity_types WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined

  return row
    ? {
        id: row.id as string,
        name: row.name as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        isBuiltIn: toBoolean(row.is_built_in),
      }
    : null
}

const listTaskTemplates = (database: DatabaseSync) =>
  (
    database.prepare('SELECT * FROM task_templates ORDER BY updated_at DESC').all() as Array<
      Record<string, unknown>
    >
  ).map(mapTemplateRow)

const getTaskTemplateById = (database: DatabaseSync, id: string) => {
  const row = database.prepare('SELECT * FROM task_templates WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined

  return row ? mapTemplateRow(row) : null
}

const listRecurringTaskInstances = (database: DatabaseSync) =>
  (
    database
      .prepare('SELECT * FROM recurring_task_instances ORDER BY generated_at ASC')
      .all() as Array<Record<string, unknown>>
  ).map(mapRecurringInstanceRow)

const getRecurringTaskInstanceById = (database: DatabaseSync, id: string) => {
  const row = database.prepare('SELECT * FROM recurring_task_instances WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined

  return row ? mapRecurringInstanceRow(row) : null
}

const listDayPlanItems = (database: DatabaseSync) =>
  (
    database.prepare('SELECT * FROM day_plan_items ORDER BY created_at ASC').all() as Array<
      Record<string, unknown>
    >
  ).map(mapDayPlanItemRow)

const getDayPlanItemById = (database: DatabaseSync, id: string) => {
  const row = database.prepare('SELECT * FROM day_plan_items WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined

  return row ? mapDayPlanItemRow(row) : null
}

const upsertSettings = (database: DatabaseSync, settings: AppSettings) => {
  database
    .prepare(`
      INSERT INTO settings (
        id, initialized, tie_breaker_order, weather_enabled,
        completed_time_rounding_minutes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        initialized = excluded.initialized,
        tie_breaker_order = excluded.tie_breaker_order,
        weather_enabled = excluded.weather_enabled,
        completed_time_rounding_minutes = excluded.completed_time_rounding_minutes,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `)
    .run(
      SETTINGS_ROW_ID,
      settings.initialized ? 1 : 0,
      settings.tieBreakerOrder,
      settings.weatherEnabled ? 1 : 0,
      settings.completedAtRoundingMinutes,
      settings.createdAt,
      settings.updatedAt,
    )
}

const insertSceneTag = (database: DatabaseSync, sceneTag: SceneTag) => {
  database
    .prepare(`
      INSERT INTO scene_tags (id, name, created_at, updated_at, is_built_in)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      sceneTag.id,
      sceneTag.name,
      sceneTag.createdAt,
      sceneTag.updatedAt,
      sceneTag.isBuiltIn ? 1 : 0,
    )
}

const replaceSceneTag = (database: DatabaseSync, sceneTag: SceneTag) => {
  database
    .prepare(`
      UPDATE scene_tags
      SET name = ?, created_at = ?, updated_at = ?, is_built_in = ?
      WHERE id = ?
    `)
    .run(
      sceneTag.name,
      sceneTag.createdAt,
      sceneTag.updatedAt,
      sceneTag.isBuiltIn ? 1 : 0,
      sceneTag.id,
    )
}

const insertActivityType = (database: DatabaseSync, activityType: ActivityType) => {
  database
    .prepare(`
      INSERT INTO activity_types (id, name, created_at, updated_at, is_built_in)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      activityType.id,
      activityType.name,
      activityType.createdAt,
      activityType.updatedAt,
      activityType.isBuiltIn ? 1 : 0,
    )
}

const replaceActivityType = (database: DatabaseSync, activityType: ActivityType) => {
  database
    .prepare(`
      UPDATE activity_types
      SET name = ?, created_at = ?, updated_at = ?, is_built_in = ?
      WHERE id = ?
    `)
    .run(
      activityType.name,
      activityType.createdAt,
      activityType.updatedAt,
      activityType.isBuiltIn ? 1 : 0,
      activityType.id,
    )
}

const insertTaskTemplateRow = (database: DatabaseSync, template: TaskTemplate) => {
  database
    .prepare(`
      INSERT INTO task_templates (
        id, template_kind, title, date_value, deadline_date, activity_type_id, scene_tag_ids_json,
        interest_level, is_necessary, requires_preparation, preparation_notes,
        recurrence, repeat_type, repeat_interval_unit, repeat_interval_value,
        is_segmented, created_at, updated_at, grass_status, is_archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      template.id,
      template.templateKind,
      template.title,
      template.date,
      template.deadlineDate ?? null,
      template.activityTypeId ?? null,
      serializeStringArray(template.sceneTagIds),
      template.interestLevel,
      template.isNecessary ? 1 : 0,
      template.requiresPreparation ? 1 : 0,
      template.preparationNotes,
      template.recurrence,
      template.repeatType ?? null,
      template.repeatIntervalUnit ?? null,
      template.repeatIntervalValue ?? null,
      template.isSegmented ? 1 : 0,
      template.createdAt,
      template.updatedAt,
      template.grassStatus ?? null,
      template.isArchived ? 1 : 0,
    )
}

const replaceTaskTemplateRow = (database: DatabaseSync, template: TaskTemplate) => {
  database
    .prepare(`
      UPDATE task_templates
      SET
        template_kind = ?,
        title = ?,
        date_value = ?,
        deadline_date = ?,
        activity_type_id = ?,
        scene_tag_ids_json = ?,
        interest_level = ?,
        is_necessary = ?,
        requires_preparation = ?,
        preparation_notes = ?,
        recurrence = ?,
        repeat_type = ?,
        repeat_interval_unit = ?,
        repeat_interval_value = ?,
        is_segmented = ?,
        created_at = ?,
        updated_at = ?,
        grass_status = ?,
        is_archived = ?
      WHERE id = ?
    `)
    .run(
      template.templateKind,
      template.title,
      template.date,
      template.deadlineDate ?? null,
      template.activityTypeId ?? null,
      serializeStringArray(template.sceneTagIds),
      template.interestLevel,
      template.isNecessary ? 1 : 0,
      template.requiresPreparation ? 1 : 0,
      template.preparationNotes,
      template.recurrence,
      template.repeatType ?? null,
      template.repeatIntervalUnit ?? null,
      template.repeatIntervalValue ?? null,
      template.isSegmented ? 1 : 0,
      template.createdAt,
      template.updatedAt,
      template.grassStatus ?? null,
      template.isArchived ? 1 : 0,
      template.id,
    )
}

const insertRecurringTaskInstanceRow = (
  database: DatabaseSync,
  instance: RecurringTaskInstance,
) => {
  database
    .prepare(`
      INSERT INTO recurring_task_instances (
        id, template_id, date_key, target_date, recurrence, repeat_type,
        repeat_interval_unit, repeat_interval_value, status, progress_state,
        progress_percent, progress_note, generated_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      instance.id,
      instance.templateId,
      instance.dateKey,
      instance.targetDate ?? null,
      instance.recurrence,
      instance.repeatType ?? null,
      instance.repeatIntervalUnit ?? null,
      instance.repeatIntervalValue ?? null,
      instance.status,
      instance.progressState,
      instance.progressPercent,
      instance.progressNote,
      instance.generatedAt,
      instance.updatedAt,
      instance.completedAt ?? null,
    )
}

const replaceRecurringTaskInstanceRow = (
  database: DatabaseSync,
  instance: RecurringTaskInstance,
) => {
  database
    .prepare(`
      UPDATE recurring_task_instances
      SET
        template_id = ?,
        date_key = ?,
        target_date = ?,
        recurrence = ?,
        repeat_type = ?,
        repeat_interval_unit = ?,
        repeat_interval_value = ?,
        status = ?,
        progress_state = ?,
        progress_percent = ?,
        progress_note = ?,
        generated_at = ?,
        updated_at = ?,
        completed_at = ?
      WHERE id = ?
    `)
    .run(
      instance.templateId,
      instance.dateKey,
      instance.targetDate ?? null,
      instance.recurrence,
      instance.repeatType ?? null,
      instance.repeatIntervalUnit ?? null,
      instance.repeatIntervalValue ?? null,
      instance.status,
      instance.progressState,
      instance.progressPercent,
      instance.progressNote,
      instance.generatedAt,
      instance.updatedAt,
      instance.completedAt ?? null,
      instance.id,
    )
}

const insertDayPlanItemRow = (database: DatabaseSync, item: DayPlanItem) => {
  database
    .prepare(`
    INSERT INTO day_plan_items (
      id, date_value, origin_date, target_date, deadline_date, time_block, time_block_source,
      sort_order, source, template_id, recurring_instance_id, consumes_date_trigger,
      root_item_id, continuation_of_item_id, carried_from_date, title, activity_type_id,
      is_necessary, requires_preparation, preparation_notes, is_segmented,
      progress_state, progress_percent, status, created_at, updated_at, completed_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      item.id,
      item.date,
      item.originDate ?? null,
      item.targetDate ?? null,
      item.deadlineDate ?? null,
      item.timeBlock,
      item.timeBlockSource,
      item.sortOrder,
      item.source,
      item.templateId ?? null,
      item.recurringInstanceId ?? null,
      item.consumesDateTrigger === undefined ? null : item.consumesDateTrigger ? 1 : 0,
      item.rootItemId ?? null,
      item.continuationOfItemId ?? null,
      item.carriedFromDate ?? null,
      item.title,
      item.activityTypeId ?? null,
      item.isNecessary ? 1 : 0,
      item.requiresPreparation ? 1 : 0,
      item.preparationNotes,
      item.isSegmented ? 1 : 0,
      item.progressState,
      item.progressPercent,
      item.status,
      item.createdAt,
      item.updatedAt,
      item.completedAt ?? null,
      item.deletedAt ?? null,
    )
}

const replaceDayPlanItemRow = (database: DatabaseSync, item: DayPlanItem) => {
  database
    .prepare(`
      UPDATE day_plan_items
      SET
        date_value = ?,
        origin_date = ?,
        target_date = ?,
        deadline_date = ?,
        time_block = ?,
        time_block_source = ?,
        sort_order = ?,
        source = ?,
        template_id = ?,
        recurring_instance_id = ?,
        consumes_date_trigger = ?,
        root_item_id = ?,
        continuation_of_item_id = ?,
        carried_from_date = ?,
        title = ?,
        activity_type_id = ?,
        is_necessary = ?,
        requires_preparation = ?,
        preparation_notes = ?,
        is_segmented = ?,
        progress_state = ?,
        progress_percent = ?,
        status = ?,
        created_at = ?,
        updated_at = ?,
        completed_at = ?,
        deleted_at = ?
      WHERE id = ?
    `)
    .run(
      item.date,
      item.originDate ?? null,
      item.targetDate ?? null,
      item.deadlineDate ?? null,
      item.timeBlock,
      item.timeBlockSource,
      item.sortOrder,
      item.source,
      item.templateId ?? null,
      item.recurringInstanceId ?? null,
      item.consumesDateTrigger === undefined ? null : item.consumesDateTrigger ? 1 : 0,
      item.rootItemId ?? null,
      item.continuationOfItemId ?? null,
      item.carriedFromDate ?? null,
      item.title,
      item.activityTypeId ?? null,
      item.isNecessary ? 1 : 0,
      item.requiresPreparation ? 1 : 0,
      item.preparationNotes,
      item.isSegmented ? 1 : 0,
      item.progressState,
      item.progressPercent,
      item.status,
      item.createdAt,
      item.updatedAt,
      item.completedAt ?? null,
      item.deletedAt ?? null,
      item.id,
    )
}

export const getSqliteSnapshot = (dataPath: string) => {
  const database = getDatabase(dataPath)
  const appData = readAppData(database)

  return {
    appData: appData ? cloneAppData(appData) : null,
    revision: Math.max(readRevision(database), 0),
    databasePath: getDatabasePath(dataPath),
  }
}

export const getSqliteAppData = (dataPath: string) => {
  const database = getDatabase(dataPath)
  const appData = readAppData(database)

  return appData ? cloneAppData(appData) : null
}

export const replaceSqliteSnapshot = (
  dataPath: string,
  appData: AppData,
  expectedRevision?: number,
): SnapshotResult => {
  const database = getDatabase(dataPath)
  const databasePath = getDatabasePath(dataPath)

  database.exec('BEGIN IMMEDIATE')

  try {
    const currentRevision = Math.max(readRevision(database), 0)

    if (
      expectedRevision !== undefined &&
      expectedRevision !== null &&
      currentRevision !== expectedRevision
    ) {
      database.exec('ROLLBACK')

      return {
        ok: false,
        reason: 'conflict',
        revision: currentRevision,
        databasePath,
      }
    }

    clearAppData(database)
    insertAppData(database, appData)
    queueSnapshotSyncChanges(database, appData)

    const nextRevision = currentRevision + 1
    writeMeta(database, META_APP_DATA_REVISION, String(nextRevision))
    writeMeta(database, META_SQLITE_SCHEMA_VERSION, String(SQLITE_SCHEMA_VERSION))

    database.exec('COMMIT')

    return {
      ok: true,
      appData: cloneAppData(appData),
      revision: nextRevision,
      databasePath,
    }
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

export const getSqliteSettings = (dataPath: string) => {
  const appData = getSqliteSnapshot(dataPath).appData

  return appData?.settings ?? null
}

export const getSqliteLocalSyncState = (dataPath: string): LocalSyncState => {
  const database = getDatabase(dataPath)

  return buildLocalSyncState(database)
}

export const setSqliteSyncTargetPath = (dataPath: string, targetPath: string): LocalSyncState => {
  const database = getDatabase(dataPath)
  const normalizedPath = targetPath.trim()

  if (!normalizedPath) {
    throw new Error('同步文件夹路径不能为空。')
  }

  return runSyncMetaMutation(database, () => {
    writeSyncMeta(database, SYNC_META_TARGET_PATH, normalizedPath)
    writeSyncMeta(database, SYNC_META_TARGET_CONFIG, null)
    return buildLocalSyncState(database)
  })
}

export const setSqliteSyncTargetConfig = (
  dataPath: string,
  config: SyncTargetConfig,
): LocalSyncState => {
  const database = getDatabase(dataPath)

  return runSyncMetaMutation(database, () => {
    writeSyncMeta(database, SYNC_META_TARGET_CONFIG, JSON.stringify(config))
    return buildLocalSyncState(database)
  })
}

export const clearSqliteSyncTargetPath = (dataPath: string): LocalSyncState => {
  const database = getDatabase(dataPath)

  return runSyncMetaMutation(database, () => {
    writeSyncMeta(database, SYNC_META_TARGET_PATH, null)
    return buildLocalSyncState(database)
  })
}

export const clearSqliteSyncTargetConfig = (dataPath: string): LocalSyncState => {
  const database = getDatabase(dataPath)

  return runSyncMetaMutation(database, () => {
    writeSyncMeta(database, SYNC_META_TARGET_CONFIG, null)
    return buildLocalSyncState(database)
  })
}

export const setSqliteLastSyncedAt = (dataPath: string, lastSyncedAt: string): LocalSyncState => {
  const database = getDatabase(dataPath)

  return runSyncMetaMutation(database, () => {
    writeSyncMeta(database, SYNC_META_LAST_SYNCED_AT, lastSyncedAt)
    return buildLocalSyncState(database)
  })
}

export const setSqliteLastSyncResult = (
  dataPath: string,
  result: LocalSyncResultSummary | null,
): LocalSyncState => {
  const database = getDatabase(dataPath)

  return runSyncMetaMutation(database, () => {
    writeSyncMeta(database, SYNC_META_LAST_SYNC_STATUS, result?.status ?? null)
    writeSyncMeta(database, SYNC_META_LAST_SYNC_ERROR, result?.errors[0] ?? null)
    writeSyncMeta(database, SYNC_META_LAST_SYNC_ATTEMPTED_AT, result?.attemptedAt ?? null)
    writeSyncMeta(
      database,
      SYNC_META_LAST_SYNC_RESULT,
      result ? JSON.stringify(result) : null,
    )

    return buildLocalSyncState(database)
  })
}

export const listSqliteSyncChanges = (dataPath: string): SyncChange[] => {
  const database = getDatabase(dataPath)

  return (
    database
      .prepare('SELECT * FROM sync_changes ORDER BY changed_at ASC, id ASC')
      .all() as Array<Record<string, unknown>>
  ).map(mapSyncChangeRow)
}

export const listPendingSqliteSyncChanges = (dataPath: string): SyncChange[] => {
  const database = getDatabase(dataPath)

  return (
    database
      .prepare(
        'SELECT * FROM sync_changes WHERE synced_at IS NULL ORDER BY changed_at ASC, id ASC',
      )
      .all() as Array<Record<string, unknown>>
  ).map(mapSyncChangeRow)
}

export const markSqliteSyncChangeSyncedAt = (
  dataPath: string,
  changeId: string,
  syncedAt: string,
): boolean => {
  const database = getDatabase(dataPath)

  return runSyncMetaMutation(database, () => {
    const result = database
      .prepare('UPDATE sync_changes SET synced_at = ? WHERE id = ?')
      .run(syncedAt, changeId) as { changes?: number }

    return Number(result.changes ?? 0) > 0
  })
}

export const getSqliteSyncChangeByEntity = (
  dataPath: string,
  entityType: SyncEntityType,
  entityId: string,
): SyncChange | null => {
  const database = getDatabase(dataPath)
  const row = database
    .prepare('SELECT * FROM sync_changes WHERE entity_type = ? AND entity_id = ? LIMIT 1')
    .get(entityType, entityId) as Record<string, unknown> | undefined

  return row ? mapSyncChangeRow(row) : null
}

export const applyRemoteSqliteSyncChangeState = (
  dataPath: string,
  input: {
    entityType: SyncEntityType
    entityId: string
    changeType: SyncChangeType
    changedAt: string
    syncedAt: string
  },
) => {
  const database = getDatabase(dataPath)

  return runSyncMetaMutation(database, () => {
    writeSyncChangeState(database, input)
    return true
  })
}

export const applyRemoteSqliteSettings = (dataPath: string, settings: AppSettings) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    upsertSettings(database, settings)
    writeSyncChangeState(database, {
      entityType: 'settings',
      entityId: 'app-settings',
      changeType: 'upsert',
      changedAt: settings.updatedAt,
      syncedAt: settings.updatedAt,
    })

    return settings
  })
}

export const applyRemoteSqliteSceneTag = (dataPath: string, sceneTag: SceneTag) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getSceneTagById(database, sceneTag.id)

    if (current) {
      replaceSceneTag(database, sceneTag)
    } else {
      insertSceneTag(database, sceneTag)
    }

    writeSyncChangeState(database, {
      entityType: 'sceneTag',
      entityId: sceneTag.id,
      changeType: 'upsert',
      changedAt: sceneTag.updatedAt,
      syncedAt: sceneTag.updatedAt,
    })

    return sceneTag
  })
}

export const applyRemoteSqliteActivityType = (dataPath: string, activityType: ActivityType) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getActivityTypeById(database, activityType.id)

    if (current) {
      replaceActivityType(database, activityType)
    } else {
      insertActivityType(database, activityType)
    }

    writeSyncChangeState(database, {
      entityType: 'activityType',
      entityId: activityType.id,
      changeType: 'upsert',
      changedAt: activityType.updatedAt,
      syncedAt: activityType.updatedAt,
    })

    return activityType
  })
}

export const applyRemoteSqliteTaskTemplate = (dataPath: string, template: TaskTemplate) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getTaskTemplateById(database, template.id)

    if (current) {
      replaceTaskTemplateRow(database, template)
    } else {
      insertTaskTemplateRow(database, template)
    }

    writeSyncChangeState(database, {
      entityType: 'taskTemplate',
      entityId: template.id,
      changeType: 'upsert',
      changedAt: template.updatedAt,
      syncedAt: template.updatedAt,
    })

    return template
  })
}

export const applyRemoteSqliteRecurringTaskInstance = (
  dataPath: string,
  instance: RecurringTaskInstance,
) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getRecurringTaskInstanceById(database, instance.id)

    if (current) {
      replaceRecurringTaskInstanceRow(database, instance)
    } else {
      insertRecurringTaskInstanceRow(database, instance)
    }

    writeSyncChangeState(database, {
      entityType: 'recurringTaskInstance',
      entityId: instance.id,
      changeType: 'upsert',
      changedAt: instance.updatedAt,
      syncedAt: instance.updatedAt,
    })

    return instance
  })
}

export const applyRemoteSqliteDayPlanItem = (dataPath: string, item: DayPlanItem) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getDayPlanItemById(database, item.id)

    if (current) {
      replaceDayPlanItemRow(database, item)
    } else {
      insertDayPlanItemRow(database, item)
    }

    writeSyncChangeState(database, {
      entityType: 'dayPlanItem',
      entityId: item.id,
      changeType: 'upsert',
      changedAt: item.updatedAt,
      syncedAt: item.updatedAt,
    })

    return item
  })
}

export const applyRemoteSqliteDelete = (
  dataPath: string,
  entityType: Exclude<SyncEntityType, 'settings'>,
  entityId: string,
  deletedAt: string,
) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    switch (entityType) {
      case 'sceneTag':
        database.prepare('DELETE FROM scene_tags WHERE id = ?').run(entityId)
        break
      case 'activityType':
        database.prepare('DELETE FROM activity_types WHERE id = ?').run(entityId)
        break
      case 'taskTemplate':
        database.prepare('DELETE FROM task_templates WHERE id = ?').run(entityId)
        break
      case 'recurringTaskInstance':
        database.prepare('DELETE FROM recurring_task_instances WHERE id = ?').run(entityId)
        break
      case 'dayPlanItem':
        database.prepare('DELETE FROM day_plan_items WHERE id = ?').run(entityId)
        break
    }

    writeSyncChangeState(database, {
      entityType,
      entityId,
      changeType: 'delete',
      changedAt: deletedAt,
      syncedAt: deletedAt,
    })

    return true
  })
}

export const updateSqliteSettings = (dataPath: string, input: AppSettingsUpdateInput) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = readAppData(database)?.settings

    if (!current) {
      throw new Error('Settings not initialized')
    }

    const next: AppSettings = {
      ...current,
      ...input,
      updatedAt: nowIso(),
    }

    upsertSettings(database, next)
    recordSyncChange(database, {
      entityType: 'settings',
      entityId: 'app-settings',
      changeType: 'upsert',
      changedAt: next.updatedAt,
    })

    return next
  })
}

export const listSqliteSceneTags = (dataPath: string) => listSceneTags(getDatabase(dataPath))

export const getSqliteSceneTagById = (dataPath: string, id: string) =>
  getSceneTagById(getDatabase(dataPath), id)

export const createSqliteSceneTag = (dataPath: string, sceneTag: SceneTag) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const next: SceneTag = {
      ...sceneTag,
      updatedAt: sceneTag.updatedAt || sceneTag.createdAt,
    }

    insertSceneTag(database, next)
    recordSyncChange(database, {
      entityType: 'sceneTag',
      entityId: next.id,
      changeType: 'upsert',
      changedAt: next.updatedAt,
    })

    return next
  })
}

export const updateSqliteSceneTag = (dataPath: string, input: SceneTagUpdateInput) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getSceneTagById(database, input.id)

    if (!current) {
      return null
    }

    const next: SceneTag = {
      ...current,
      ...input,
      updatedAt: nowIso(),
    }

    replaceSceneTag(database, next)
    recordSyncChange(database, {
      entityType: 'sceneTag',
      entityId: next.id,
      changeType: 'upsert',
      changedAt: next.updatedAt,
    })

    return next
  })
}

export const deleteSqliteSceneTag = (dataPath: string, id: string) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const sceneTag = getSceneTagById(database, id)

    if (!sceneTag) {
      return false
    }

    const result = database.prepare('DELETE FROM scene_tags WHERE id = ?').run(id) as {
      changes?: number
    }

    if (Number(result.changes ?? 0) > 0) {
      recordSyncChange(database, {
        entityType: 'sceneTag',
        entityId: id,
        changeType: 'delete',
        changedAt: nowIso(),
      })
    }

    return Number(result.changes ?? 0) > 0
  })
}

export const deleteSqliteSceneTagAndDetachTemplates = (dataPath: string, id: string) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const sceneTag = getSceneTagById(database, id)

    if (!sceneTag) {
      return false
    }

    database.prepare('DELETE FROM scene_tags WHERE id = ?').run(id)

    const affectedTemplates = (
      database.prepare('SELECT * FROM task_templates').all() as Array<Record<string, unknown>>
    )
      .map(mapTemplateRow)
      .filter((template) => template.sceneTagIds.includes(id))

    for (const template of affectedTemplates) {
      const nextTemplate: TaskTemplate = {
        ...template,
        sceneTagIds: template.sceneTagIds.filter((sceneTagId) => sceneTagId !== id),
        updatedAt: nowIso(),
      }

      replaceTaskTemplateRow(database, nextTemplate)
      recordSyncChange(database, {
        entityType: 'taskTemplate',
        entityId: nextTemplate.id,
        changeType: 'upsert',
        changedAt: nextTemplate.updatedAt,
      })
    }

    recordSyncChange(database, {
      entityType: 'sceneTag',
      entityId: id,
      changeType: 'delete',
      changedAt: nowIso(),
    })

    return true
  })
}

export const listSqliteActivityTypes = (dataPath: string) =>
  listActivityTypes(getDatabase(dataPath))

export const getSqliteActivityTypeById = (dataPath: string, id: string) =>
  getActivityTypeById(getDatabase(dataPath), id)

export const createSqliteActivityType = (dataPath: string, activityType: ActivityType) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const next: ActivityType = {
      ...activityType,
      updatedAt: activityType.updatedAt || activityType.createdAt,
    }

    insertActivityType(database, next)
    recordSyncChange(database, {
      entityType: 'activityType',
      entityId: next.id,
      changeType: 'upsert',
      changedAt: next.updatedAt,
    })

    return next
  })
}

export const updateSqliteActivityType = (dataPath: string, input: ActivityTypeUpdateInput) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getActivityTypeById(database, input.id)

    if (!current) {
      return null
    }

    const next: ActivityType = {
      ...current,
      ...input,
      updatedAt: nowIso(),
    }

    replaceActivityType(database, next)
    recordSyncChange(database, {
      entityType: 'activityType',
      entityId: next.id,
      changeType: 'upsert',
      changedAt: next.updatedAt,
    })

    return next
  })
}

export const deleteSqliteActivityType = (dataPath: string, id: string) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const activityType = getActivityTypeById(database, id)

    if (!activityType) {
      return false
    }

    const result = database.prepare('DELETE FROM activity_types WHERE id = ?').run(id) as {
      changes?: number
    }

    if (Number(result.changes ?? 0) > 0) {
      recordSyncChange(database, {
        entityType: 'activityType',
        entityId: id,
        changeType: 'delete',
        changedAt: nowIso(),
      })
    }

    return Number(result.changes ?? 0) > 0
  })
}

export const deleteSqliteActivityTypeIfUnused = (dataPath: string, id: string) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const isInUse = (
      database
        .prepare(
          'SELECT 1 FROM task_templates WHERE activity_type_id = ? LIMIT 1',
        )
        .get(id) as Record<string, unknown> | undefined
    )

    if (isInUse) {
      return {
        removed: false,
        reason: 'in_use' as const,
      }
    }

    const result = database.prepare('DELETE FROM activity_types WHERE id = ?').run(id) as {
      changes?: number
    }
    const removed = Number(result.changes ?? 0) > 0

    if (removed) {
      recordSyncChange(database, {
        entityType: 'activityType',
        entityId: id,
        changeType: 'delete',
        changedAt: nowIso(),
      })
    }

    return {
      removed,
      reason: removed ? null : ('not_found' as const),
    }
  })
}

export const listSqliteTaskTemplates = (dataPath: string) =>
  listTaskTemplates(getDatabase(dataPath))

export const getSqliteTaskTemplateById = (dataPath: string, id: string) =>
  getTaskTemplateById(getDatabase(dataPath), id)

export const createSqliteTaskTemplate = (dataPath: string, template: TaskTemplate) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    insertTaskTemplateRow(database, template)
    recordSyncChange(database, {
      entityType: 'taskTemplate',
      entityId: template.id,
      changeType: 'upsert',
      changedAt: template.updatedAt,
    })

    return template
  })
}

export const updateSqliteTaskTemplate = (dataPath: string, input: TaskTemplateUpdateInput) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getTaskTemplateById(database, input.id)

    if (!current) {
      return null
    }

    const next: TaskTemplate = {
      ...current,
      ...input,
      updatedAt: input.updatedAt ?? nowIso(),
    }

    replaceTaskTemplateRow(database, next)
    recordSyncChange(database, {
      entityType: 'taskTemplate',
      entityId: next.id,
      changeType: 'upsert',
      changedAt: next.updatedAt,
    })

    return next
  })
}

export const deleteSqliteTaskTemplate = (dataPath: string, id: string) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const template = getTaskTemplateById(database, id)

    if (!template) {
      return false
    }

    const result = database.prepare('DELETE FROM task_templates WHERE id = ?').run(id) as {
      changes?: number
    }

    if (Number(result.changes ?? 0) > 0) {
      recordSyncChange(database, {
        entityType: 'taskTemplate',
        entityId: id,
        changeType: 'delete',
        changedAt: nowIso(),
      })
    }

    return Number(result.changes ?? 0) > 0
  })
}

export const listSqliteRecurringTaskInstances = (dataPath: string) =>
  listRecurringTaskInstances(getDatabase(dataPath))

export const getSqliteRecurringTaskInstanceById = (dataPath: string, id: string) =>
  getRecurringTaskInstanceById(getDatabase(dataPath), id)

export const createSqliteRecurringTaskInstance = (
  dataPath: string,
  instance: RecurringTaskInstance,
) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const next: RecurringTaskInstance = {
      ...instance,
      updatedAt: instance.updatedAt || instance.completedAt || instance.generatedAt,
    }

    insertRecurringTaskInstanceRow(database, next)
    recordSyncChange(database, {
      entityType: 'recurringTaskInstance',
      entityId: next.id,
      changeType: 'upsert',
      changedAt: next.updatedAt,
    })

    return next
  })
}

export const updateSqliteRecurringTaskInstance = (
  dataPath: string,
  input: RecurringTaskInstanceUpdateInput,
) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getRecurringTaskInstanceById(database, input.id)

    if (!current) {
      return null
    }

    const next: RecurringTaskInstance = {
      ...current,
      ...input,
      updatedAt: nowIso(),
    }

    replaceRecurringTaskInstanceRow(database, next)
    recordSyncChange(database, {
      entityType: 'recurringTaskInstance',
      entityId: next.id,
      changeType: 'upsert',
      changedAt: next.updatedAt,
    })

    return next
  })
}

export const deleteSqliteRecurringTaskInstance = (dataPath: string, id: string) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const instance = getRecurringTaskInstanceById(database, id)

    if (!instance) {
      return false
    }

    const result = database
      .prepare('DELETE FROM recurring_task_instances WHERE id = ?')
      .run(id) as { changes?: number }

    if (Number(result.changes ?? 0) > 0) {
      recordSyncChange(database, {
        entityType: 'recurringTaskInstance',
        entityId: id,
        changeType: 'delete',
        changedAt: nowIso(),
      })
    }

    return Number(result.changes ?? 0) > 0
  })
}

export const listSqliteDayPlanItems = (dataPath: string) =>
  listDayPlanItems(getDatabase(dataPath))

export const getSqliteDayPlanItemById = (dataPath: string, id: string) =>
  getDayPlanItemById(getDatabase(dataPath), id)

export const createSqliteDayPlanItem = (dataPath: string, item: DayPlanItem) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const next: DayPlanItem = {
      ...item,
      updatedAt: item.updatedAt || item.deletedAt || item.completedAt || item.createdAt,
    }

    insertDayPlanItemRow(database, next)
    recordSyncChange(database, {
      entityType: 'dayPlanItem',
      entityId: next.id,
      changeType: next.status === 'deleted' ? 'delete' : 'upsert',
      changedAt: next.deletedAt || next.updatedAt,
    })

    return next
  })
}

export const updateSqliteDayPlanItem = (dataPath: string, input: DayPlanItemUpdateInput) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const current = getDayPlanItemById(database, input.id)

    if (!current) {
      return null
    }

    const next: DayPlanItem = {
      ...current,
      ...input,
      updatedAt: input.updatedAt ?? nowIso(),
    }

    replaceDayPlanItemRow(database, next)
    recordSyncChange(database, {
      entityType: 'dayPlanItem',
      entityId: next.id,
      changeType: next.status === 'deleted' ? 'delete' : 'upsert',
      changedAt: next.deletedAt || next.updatedAt,
    })

    return next
  })
}

export const deleteSqliteDayPlanItem = (dataPath: string, id: string) => {
  const database = getDatabase(dataPath)

  return runMutation(database, () => {
    const item = getDayPlanItemById(database, id)

    if (!item) {
      return false
    }

    const result = database.prepare('DELETE FROM day_plan_items WHERE id = ?').run(id) as {
      changes?: number
    }

    if (Number(result.changes ?? 0) > 0) {
      recordSyncChange(database, {
        entityType: 'dayPlanItem',
        entityId: id,
        changeType: 'delete',
        changedAt: nowIso(),
      })
    }

    return Number(result.changes ?? 0) > 0
  })
}

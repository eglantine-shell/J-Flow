import {
  APP_DATA_RECORD_ID,
  APP_DATA_SCHEMA_VERSION,
  appDataRecordSchema,
  appDataSchema,
  type AppDataRecord,
} from '@/db/schema'
import { normalizeCompletedAtRoundingMinutes } from '@/features/todo/completed-at-rounding'
import { resolveRepeatRule, serializeRepeatRule } from '@/features/recurrence/repeat-rule'
import { tutorialDemoAppData } from '@/features/tutorial/tutorial-demo-data'
import { mockSeedAppData } from '@/mocks'
import type {
  ActivityType,
  AppData,
  AppSettings,
  DayPlanItem,
  GrassStatus,
  LocalSyncState,
  RecurringTaskInstance,
  SceneTag,
  SyncChange,
  SyncExportResult,
  SyncImportResult,
  SyncNowResult,
  SyncTargetConfig,
  SyncTargetTestResult,
  TaskTemplate,
} from '@/types'

type AppDataUpdater = (current: AppData) => AppData

type SceneTagCreateInput = Omit<SceneTag, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<SceneTag, 'id' | 'createdAt' | 'updatedAt'>>

type ActivityTypeCreateInput = Omit<ActivityType, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<ActivityType, 'id' | 'createdAt' | 'updatedAt'>>

type TaskTemplateCreateInput = Omit<
  TaskTemplate,
  'id' | 'createdAt' | 'updatedAt' | 'date' | 'isStepped' | 'currentStep' | 'nextStep'
> &
  Partial<Pick<TaskTemplate, 'id' | 'createdAt' | 'updatedAt' | 'date' | 'isStepped' | 'currentStep' | 'nextStep'>>

type RecurringTaskInstanceCreateInput = Omit<
  RecurringTaskInstance,
  'id' | 'generatedAt' | 'updatedAt'
> & Partial<Pick<RecurringTaskInstance, 'id' | 'generatedAt' | 'updatedAt'>>

type DayPlanItemCreateInput = Omit<
  DayPlanItem,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'isStepped'
  | 'currentStep'
  | 'nextStep'
  | 'stepRootItemId'
  | 'previousStepItemId'
> &
  Partial<
    Pick<
      DayPlanItem,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'isStepped'
      | 'currentStep'
      | 'nextStep'
      | 'stepRootItemId'
      | 'previousStepItemId'
    >
  >

type SceneTagUpdateInput = Partial<Omit<SceneTag, 'id'>> & Pick<SceneTag, 'id'>
type ActivityTypeUpdateInput = Partial<Omit<ActivityType, 'id'>> & Pick<ActivityType, 'id'>
type TaskTemplateUpdateInput = Partial<Omit<TaskTemplate, 'id'>> & Pick<TaskTemplate, 'id'>
type RecurringTaskInstanceUpdateInput = Partial<Omit<RecurringTaskInstance, 'id'>> &
  Pick<RecurringTaskInstance, 'id'>
type DayPlanItemUpdateInput = Partial<Omit<DayPlanItem, 'id'>> & Pick<DayPlanItem, 'id'>
const STORAGE_META_KEY = 'app_data_schema_version'
type AppSettingsUpdateInput = Partial<Omit<AppSettings, 'createdAt' | 'updatedAt'>>

const cloneAppData = (appData: AppData): AppData => structuredClone(appData)

let tutorialMemoryAppData: AppData | null = null

const isTutorialStorageMode = () => {
  if (typeof window === 'undefined') {
    return false
  }

  return new URLSearchParams(window.location.search).get('tutorial') === '1'
}

const getTutorialMemoryAppData = () => {
  if (!tutorialMemoryAppData) {
    tutorialMemoryAppData = appDataSchema.parse(tutorialDemoAppData)
  }

  return cloneAppData(tutorialMemoryAppData)
}

const replaceTutorialMemoryAppData = (appData: AppData) => {
  tutorialMemoryAppData = appDataSchema.parse(appData)

  return cloneAppData(tutorialMemoryAppData)
}

const nowIso = () => new Date().toISOString()

const pad = (value: number) => String(value).padStart(2, '0')

const todayDateString = () => {
  const now = new Date()

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const resolveDayPlanItemOriginDate = (
  item: Pick<DayPlanItem, 'originDate' | 'targetDate' | 'date'>,
) => item.originDate ?? item.targetDate ?? item.date

const resolveSceneTagUpdatedAt = (sceneTag: Pick<SceneTag, 'createdAt'> & Partial<Pick<SceneTag, 'updatedAt'>>) =>
  sceneTag.updatedAt ?? sceneTag.createdAt

const resolveActivityTypeUpdatedAt = (
  activityType: Pick<ActivityType, 'createdAt'> & Partial<Pick<ActivityType, 'updatedAt'>>,
) => activityType.updatedAt ?? activityType.createdAt

const resolveRecurringTaskInstanceUpdatedAt = (
  instance: Pick<RecurringTaskInstance, 'generatedAt'> &
    Partial<Pick<RecurringTaskInstance, 'updatedAt' | 'completedAt'>>,
) => instance.updatedAt ?? instance.completedAt ?? instance.generatedAt

const resolveDayPlanItemUpdatedAt = (
  item: Pick<DayPlanItem, 'createdAt'> &
    Partial<Pick<DayPlanItem, 'updatedAt' | 'completedAt' | 'deletedAt'>>,
) => item.updatedAt ?? item.deletedAt ?? item.completedAt ?? item.createdAt

const resolveGrassStatus = (
  item: Pick<TaskTemplate, 'templateKind' | 'isArchived'> & Partial<Pick<TaskTemplate, 'grassStatus'>>,
): GrassStatus | undefined => {
  if (item.templateKind !== 'grass') {
    return undefined
  }

  if (item.grassStatus) {
    return item.grassStatus
  }

  return item.isArchived ? 'archived' : 'active'
}

const LEGACY_SEGMENTED_ADVANCE_PATTERN = /^推进\s+(.+?)\s+(\d+)%\s*->\s*(\d+)%$/
const LEGACY_SEGMENTED_PROGRESS_PATTERN = /^(.+?)\s+进度：(\d+)%$/
const normalizeLogbookTime = (time: string) => {
  const compact = time.replace(':', '').replace('：', '')

  if (!/^\d{4}$/.test(compact)) {
    return time
  }

  return `${compact.slice(0, 2)}:${compact.slice(2, 4)}`
}

const normalizeLogbookSnapshotItem = (item: Record<string, unknown>) => {
  const normalized = {
    ...item,
  }

  if (typeof normalized.titleSnapshot !== 'string') {
    return normalized
  }

  const advanceMatch = normalized.titleSnapshot.match(LEGACY_SEGMENTED_ADVANCE_PATTERN)

  if (advanceMatch) {
    normalized.titleSnapshot = advanceMatch[1]?.trim() ?? normalized.titleSnapshot
    normalized.isSegmented = true
    normalized.progressText = `已推进 ${advanceMatch[2]}%→${advanceMatch[3]}%`
    return normalized
  }

  const progressMatch = normalized.titleSnapshot.match(LEGACY_SEGMENTED_PROGRESS_PATTERN)

  if (progressMatch) {
    normalized.titleSnapshot = progressMatch[1]?.trim() ?? normalized.titleSnapshot
    normalized.isSegmented = true
    normalized.progressText = `当前进度 ${progressMatch[2]}%`
  }

  return normalized
}

const normalizeLegacyLogbookEntry = (entry: unknown) => {
  if (!entry || typeof entry !== 'object') {
    return entry
  }

  const candidate = entry as Record<string, unknown>

  if (Array.isArray(candidate.snapshotItems)) {
    return {
      ...candidate,
      snapshotItems: candidate.snapshotItems
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => normalizeLogbookSnapshotItem(item)),
    }
  }

  const completedItems = Array.isArray(candidate.completedItems) ? candidate.completedItems : []
  const unfinishedItems = Array.isArray(candidate.unfinishedItems) ? candidate.unfinishedItems : []
  const deletedItems = Array.isArray(candidate.deletedItems) ? candidate.deletedItems : []

  return {
    ...candidate,
    snapshotItems: [
      ...completedItems
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : createId('logbook-snapshot'),
          status: 'completed' as const,
          titleSnapshot: typeof item.titleSnapshot === 'string' ? item.titleSnapshot : '',
          time:
            typeof item.time === 'string'
              ? normalizeLogbookTime(item.time)
              : undefined,
          isNecessary: Boolean(item.isNecessary),
          isPicked: item.kind === 'picked',
          isSegmented: false,
          deadlineStatus: 'none' as const,
        })),
      ...unfinishedItems
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : createId('logbook-snapshot'),
          status: 'pending' as const,
          titleSnapshot: typeof item.titleSnapshot === 'string' ? item.titleSnapshot : '',
          isNecessary: Boolean(item.isNecessary),
          isPicked: false,
          isSegmented: false,
          deadlineStatus: 'none' as const,
        }))
        .map((item) => normalizeLogbookSnapshotItem(item)),
      ...deletedItems
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : createId('logbook-snapshot'),
          status: 'deleted' as const,
          titleSnapshot: typeof item.titleSnapshot === 'string' ? item.titleSnapshot : '',
          isNecessary: Boolean(item.isNecessary),
          isPicked: false,
          isSegmented: false,
          deadlineStatus: 'none' as const,
        })),
    ],
  }
}

const normalizeLegacyAppData = (appData: AppData): AppData => ({
  ...appData,
  logbookEntries: (appData.logbookEntries ?? []).map((entry) => normalizeLegacyLogbookEntry(entry)) as AppData['logbookEntries'],
  segmentedProgressLogs: appData.segmentedProgressLogs ?? [],
  settings: {
    ...appData.settings,
    completedAtRoundingMinutes: normalizeCompletedAtRoundingMinutes(
      appData.settings.completedAtRoundingMinutes,
    ),
    defaultNightTodoByTimeEnabled:
      appData.settings.defaultNightTodoByTimeEnabled ?? false,
    defaultNightTodoStartHour:
      appData.settings.defaultNightTodoStartHour ?? 17,
    defaultNightTodoEndHour:
      appData.settings.defaultNightTodoEndHour ?? 23,
  },
  sceneTags: appData.sceneTags.map((sceneTag) => ({
    ...sceneTag,
    updatedAt: resolveSceneTagUpdatedAt(sceneTag),
  })),
  activityTypes: appData.activityTypes.map((activityType) => ({
    ...activityType,
    updatedAt: resolveActivityTypeUpdatedAt(activityType),
  })),
  taskTemplates: appData.taskTemplates.map((template) => ({
    ...template,
    deadlineDate: template.isNecessary ? template.deadlineDate ?? (template.date || undefined) : undefined,
    ...serializeRepeatRule(resolveRepeatRule(template)),
    isStepped: template.isStepped ?? false,
    currentStep: template.currentStep ?? '',
    nextStep: template.nextStep ?? '',
    isSegmented: template.isStepped ? false : template.isSegmented,
    grassStatus: resolveGrassStatus(template),
    isArchived:
      template.templateKind === 'grass'
        ? resolveGrassStatus(template) === 'archived'
        : template.isArchived,
  })),
  recurringTaskInstances: appData.recurringTaskInstances.map((instance) => ({
    ...instance,
    updatedAt: resolveRecurringTaskInstanceUpdatedAt(instance),
    ...(() => {
      const repeatRule = resolveRepeatRule(instance)
      const serializedRepeatRule = serializeRepeatRule(repeatRule)

      return {
        recurrence:
          serializedRepeatRule.recurrence === 'none'
            ? instance.recurrence
            : serializedRepeatRule.recurrence,
        repeatType:
          serializedRepeatRule.repeatType === 'none'
            ? undefined
            : serializedRepeatRule.repeatType,
        repeatIntervalUnit: serializedRepeatRule.repeatIntervalUnit,
        repeatIntervalValue: serializedRepeatRule.repeatIntervalValue,
      }
    })(),
  })),
  dayPlanItems: appData.dayPlanItems.map((item) => ({
    ...item,
    originDate: resolveDayPlanItemOriginDate(item),
    deadlineDate: item.isNecessary ? item.deadlineDate ?? item.date : undefined,
    isStepped: item.isStepped ?? false,
    currentStep: item.currentStep ?? '',
    nextStep: item.nextStep ?? '',
    isSegmented: item.isStepped ? false : item.isSegmented,
    stepRootItemId: item.stepRootItemId,
    previousStepItemId: item.previousStepItemId,
    updatedAt: resolveDayPlanItemUpdatedAt(item),
    deletedAt: item.deletedAt,
  })),
})

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const parseAppData = (appData: AppData) =>
  appDataSchema.parse(cloneAppData(normalizeLegacyAppData(appData)))

const buildRecord = (payload: AppData): AppDataRecord =>
  appDataRecordSchema.parse({
    id: APP_DATA_RECORD_ID,
    schemaVersion: APP_DATA_SCHEMA_VERSION,
    payload,
    updatedAt: nowIso(),
  })

async function getWebDb() {
  const { db } = await import('@/db/client')

  return db
}

const getDesktopStorageApi = () => {
  if (isTutorialStorageMode()) {
    return null
  }

  if (typeof window === 'undefined' || !window.jflowDesktop) {
    return null
  }

  return window.jflowDesktop
}

const getDesktopRepositoryApi = () => {
  const desktopApi = getDesktopStorageApi()

  if (!desktopApi?.repository) {
    return null
  }

  return desktopApi.repository
}

const isDesktopStorageEnabled = () => Boolean(getDesktopStorageApi())

async function getDesktopAppData() {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository) {
    throw new Error('Desktop repository bridge unavailable')
  }

  const appData = await desktopRepository.appData.get()

  return appData ? parseAppData(appData) : null
}

async function replaceDesktopAppData(appData: AppData) {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository) {
    throw new Error('Desktop repository bridge unavailable')
  }

  return parseAppData(await desktopRepository.appData.replace(parseAppData(appData)))
}

async function resetDesktopAppData(seed: AppData) {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository) {
    throw new Error('Desktop repository bridge unavailable')
  }

  return parseAppData(await desktopRepository.appData.reset(parseAppData(seed)))
}

async function exportDesktopAppData() {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository) {
    throw new Error('Desktop repository bridge unavailable')
  }

  return parseAppData(await desktopRepository.appData.exportSnapshot())
}

async function importDesktopAppData(appData: AppData) {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository) {
    throw new Error('Desktop repository bridge unavailable')
  }

  return parseAppData(await desktopRepository.appData.importSnapshot(parseAppData(appData)))
}

async function getDesktopLocalSyncState() {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.getState()
}

async function listDesktopSyncChanges() {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.listChanges()
}

async function chooseDesktopSyncTargetPath() {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.chooseTargetPath()
}

async function openDesktopSyncTargetPath() {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.openTargetPath()
}

async function setDesktopSyncTargetPath(targetPath: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.setTargetPath(targetPath)
}

async function clearDesktopSyncTargetPath() {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.clearTargetPath()
}

async function testDesktopSyncTargetPath(targetPath?: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.testTargetPath(targetPath)
}

async function exportDesktopLocalSyncChanges() {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.exportLocalChanges()
}

async function importDesktopRemoteSyncChanges() {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.importRemoteChanges()
}

async function runDesktopManualSync(): Promise<SyncNowResult> {
  const desktopRepository = getDesktopRepositoryApi()

  if (!desktopRepository?.sync) {
    throw new Error('Desktop sync bridge unavailable')
  }

  return desktopRepository.sync.syncNow()
}

async function prepareDesktopCurrentDayState(selectedDateKey?: string) {
  if (isTutorialStorageMode()) {
    return getTutorialMemoryAppData()
  }

  const desktopApi = getDesktopStorageApi()

  if (!desktopApi?.prepareCurrentDayState) {
    throw new Error('Desktop lifecycle bridge unavailable')
  }

  return desktopApi.prepareCurrentDayState(selectedDateKey)
}

async function readAppDataRecord() {
  const db = await getWebDb()
  const record = await db.appData.get(APP_DATA_RECORD_ID)

  if (!record) {
    return null
  }

  const rawRecord = record as Partial<AppDataRecord> & {
    payload?: AppData
  }
  const parsedPayload = parseAppData(rawRecord.payload ?? mockSeedAppData)
  const parsedRecord = appDataRecordSchema.parse({
    id: rawRecord.id ?? APP_DATA_RECORD_ID,
    schemaVersion: rawRecord.schemaVersion ?? APP_DATA_SCHEMA_VERSION,
    payload: parsedPayload,
    updatedAt: rawRecord.updatedAt ?? nowIso(),
  })

  return {
    ...parsedRecord,
    payload: parsedPayload,
  }
}

async function readLegacyIndexedDbSnapshotForDesktopMigration() {
  try {
    const db = await getWebDb()
    await db.open()
    const existingRecord = await readAppDataRecord()

    return existingRecord ? cloneAppData(existingRecord.payload) : null
  } catch {
    return null
  }
}

async function persistAppData(appData: AppData) {
  const db = await getWebDb()
  const parsed = parseAppData(appData)
  const record = buildRecord(parsed)

  await db.transaction('rw', db.appData, db.meta, async () => {
    await db.appData.put(record)
    await db.meta.put({
      key: STORAGE_META_KEY,
      value: String(record.schemaVersion),
    })
  })

  return cloneAppData(parsed)
}

async function mutateAppData(mutator: AppDataUpdater) {
  const db = await getWebDb()
  let persisted: AppData | null = null

  await db.transaction('rw', db.appData, db.meta, async () => {
    const existingRecord = await db.appData.get(APP_DATA_RECORD_ID)
    const current = existingRecord
      ? parseAppData(
          ((existingRecord as Partial<AppDataRecord> & {
            payload?: AppData
          }).payload ?? mockSeedAppData),
        )
      : parseAppData(mockSeedAppData)
    const next = parseAppData(mutator(cloneAppData(current)))
    const record = buildRecord(next)

    await db.appData.put(record)
    await db.meta.put({
      key: STORAGE_META_KEY,
      value: String(record.schemaVersion),
    })

    persisted = cloneAppData(next)
  })

  if (!persisted) {
    throw new Error('App data mutation failed')
  }

  return persisted
}

function updateById<T extends { id: string }>(
  collection: T[],
  updates: Partial<Omit<T, 'id'>> & Pick<T, 'id'>,
  merge: (current: T, next: Partial<Omit<T, 'id'>> & Pick<T, 'id'>) => T = (current, next) => ({
    ...current,
    ...next,
  }),
) {
  let updatedEntity: T | null = null

  const nextCollection = collection.map((item) => {
    if (item.id !== updates.id) {
      return item
    }

    updatedEntity = merge(item, updates)
    return updatedEntity
  })

  if (!updatedEntity) {
    throw new Error(`Entity not found: ${updates.id}`)
  }

  return {
    collection: nextCollection,
    entity: updatedEntity,
  }
}

function removeById<T extends { id: string }>(collection: T[], id: string) {
  const nextCollection = collection.filter((item) => item.id !== id)

  return {
    collection: nextCollection,
    removed: nextCollection.length !== collection.length,
  }
}

function normalizeSceneTag(input: SceneTagCreateInput): SceneTag {
  const createdAt = input.createdAt ?? nowIso()

  return {
    id: input.id ?? createId('scene'),
    name: input.name,
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
    isBuiltIn: input.isBuiltIn,
  }
}

function normalizeActivityType(input: ActivityTypeCreateInput): ActivityType {
  const createdAt = input.createdAt ?? nowIso()

  return {
    id: input.id ?? createId('activity'),
    name: input.name,
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
    isBuiltIn: input.isBuiltIn,
  }
}

function normalizeTaskTemplate(input: TaskTemplateCreateInput): TaskTemplate {
  const timestamp = nowIso()
  const templateKind = input.templateKind ?? 'grass'
  const isStepped = input.isStepped ?? false
  const grassStatus =
    templateKind === 'grass'
      ? resolveGrassStatus({
          templateKind,
          grassStatus: input.grassStatus,
          isArchived: input.isArchived,
        })
      : undefined

  return {
    id: input.id ?? createId('template'),
    templateKind,
    title: input.title,
    date: input.date ?? todayDateString(),
    deadlineDate: input.deadlineDate,
    activityTypeId: input.activityTypeId,
    sceneTagIds: [...input.sceneTagIds],
    interestLevel: input.interestLevel,
    isNecessary: input.isNecessary,
    requiresPreparation: input.requiresPreparation,
    preparationNotes: input.preparationNotes,
    recurrence: input.recurrence,
    repeatType: input.repeatType,
    repeatIntervalUnit: input.repeatIntervalUnit,
    repeatIntervalValue: input.repeatIntervalValue,
    isSegmented: isStepped ? false : input.isSegmented,
    isStepped,
    currentStep: isStepped ? input.currentStep?.trim() ?? '' : '',
    nextStep: isStepped ? input.nextStep?.trim() ?? '' : '',
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
    grassStatus,
    isArchived:
      templateKind === 'grass'
        ? grassStatus === 'archived'
        : input.isArchived,
  }
}

function normalizeRecurringTaskInstance(
  input: RecurringTaskInstanceCreateInput,
): RecurringTaskInstance {
  const generatedAt = input.generatedAt ?? nowIso()

  return {
    id: input.id ?? createId('recurring-instance'),
    templateId: input.templateId,
    dateKey: input.dateKey,
    targetDate: input.targetDate,
    recurrence: input.recurrence,
    repeatType: input.repeatType,
    repeatIntervalUnit: input.repeatIntervalUnit,
    repeatIntervalValue: input.repeatIntervalValue,
    status: input.status,
    progressState: input.progressState,
    progressPercent: input.progressPercent,
    progressNote: input.progressNote,
    generatedAt,
    updatedAt: input.updatedAt ?? input.completedAt ?? generatedAt,
    completedAt: input.completedAt,
  }
}

function normalizeDayPlanItem(input: DayPlanItemCreateInput): DayPlanItem {
  const createdAt = input.createdAt ?? nowIso()
  const isStepped = input.isStepped ?? false

  return {
    id: input.id ?? createId('day-plan-item'),
    date: input.date,
    originDate: resolveDayPlanItemOriginDate(input),
    targetDate: input.targetDate,
    deadlineDate: input.deadlineDate,
    timeBlock: input.timeBlock,
    timeBlockSource: input.timeBlockSource,
    sortOrder: input.sortOrder,
    source: input.source,
    templateId: input.templateId,
    recurringInstanceId: input.recurringInstanceId,
    consumesDateTrigger: input.consumesDateTrigger,
    rootItemId: input.rootItemId,
    continuationOfItemId: input.continuationOfItemId,
    carriedFromDate: input.carriedFromDate,
    title: input.title,
    activityTypeId: input.activityTypeId,
    isNecessary: input.isNecessary,
    requiresPreparation: input.requiresPreparation,
    preparationNotes: input.preparationNotes,
    isSegmented: isStepped ? false : input.isSegmented,
    isStepped,
    currentStep: isStepped ? input.currentStep?.trim() ?? '' : '',
    nextStep: isStepped ? input.nextStep?.trim() ?? '' : '',
    stepRootItemId: input.stepRootItemId,
    previousStepItemId: input.previousStepItemId,
    progressState: input.progressState,
    progressPercent: input.progressPercent,
    status: input.status,
    createdAt,
    updatedAt: input.updatedAt ?? input.deletedAt ?? input.completedAt ?? createdAt,
    completedAt: input.completedAt,
    deletedAt: input.deletedAt,
  }
}

export async function initializeAppData(seed: AppData = mockSeedAppData) {
  if (isTutorialStorageMode()) {
    return getTutorialMemoryAppData()
  }

  if (isDesktopStorageEnabled()) {
    const appData = await getDesktopAppData()

    if (appData) {
      return cloneAppData(appData)
    }

    const migrationSeed =
      (await readLegacyIndexedDbSnapshotForDesktopMigration()) ?? parseAppData(seed)
    const initialized = await replaceDesktopAppData(migrationSeed)

    return cloneAppData(initialized)
  }

  const db = await getWebDb()
  await db.open()

  const existingRecord = await readAppDataRecord()

  if (existingRecord) {
    return cloneAppData(existingRecord.payload)
  }

  return persistAppData(seed)
}

export async function getAppData() {
  if (isTutorialStorageMode()) {
    return getTutorialMemoryAppData()
  }

  if (isDesktopStorageEnabled()) {
    const appData = await getDesktopAppData()

    if (appData) {
      return cloneAppData(appData)
    }

    return initializeAppData()
  }

  const existingRecord = await readAppDataRecord()

  if (existingRecord) {
    return cloneAppData(existingRecord.payload)
  }

  return initializeAppData()
}

export async function exportAppDataSnapshot() {
  if (isTutorialStorageMode()) {
    return getTutorialMemoryAppData()
  }

  if (isDesktopStorageEnabled()) {
    return cloneAppData(await exportDesktopAppData())
  }

  return cloneAppData(await getAppData())
}

export async function replaceAppData(appData: AppData) {
  if (isTutorialStorageMode()) {
    return replaceTutorialMemoryAppData(appData)
  }

  if (isDesktopStorageEnabled()) {
    return cloneAppData(await replaceDesktopAppData(appData))
  }

  return persistAppData(appData)
}

export async function importAppDataSnapshot(appData: AppData) {
  if (isTutorialStorageMode()) {
    return replaceTutorialMemoryAppData(appData)
  }

  if (isDesktopStorageEnabled()) {
    return cloneAppData(await importDesktopAppData(appData))
  }

  return replaceAppData(appData)
}

export async function updateAppData(updater: AppDataUpdater) {
  if (isTutorialStorageMode()) {
    return replaceTutorialMemoryAppData(updater(getTutorialMemoryAppData()))
  }

  if (isDesktopStorageEnabled()) {
    const current = (await getDesktopAppData()) ?? parseAppData(mockSeedAppData)
    const next = parseAppData(updater(cloneAppData(current)))

    return cloneAppData(await replaceDesktopAppData(next))
  }

  return mutateAppData(updater)
}

export async function resetAppData(seed: AppData = mockSeedAppData) {
  if (isTutorialStorageMode()) {
    return replaceTutorialMemoryAppData(seed)
  }

  if (isDesktopStorageEnabled()) {
    return cloneAppData(await resetDesktopAppData(seed))
  }

  return replaceAppData(seed)
}

async function updateSettings(input: AppSettingsUpdateInput) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.settings.update(input)
  }

  let settings: AppSettings | null = null

  await mutateAppData((current) => {
    settings = {
      ...current.settings,
      ...input,
      updatedAt: nowIso(),
    }

    return {
      ...current,
      settings: settings as AppSettings,
    }
  })

  if (!settings) {
    throw new Error('Settings update failed')
  }

  return settings
}

async function listSceneTags() {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.sceneTags.list()
  }

  return (await getAppData()).sceneTags
}

async function getSceneTagById(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.sceneTags.getById(id)
  }

  return (await listSceneTags()).find((item) => item.id === id) ?? null
}

async function createSceneTag(input: SceneTagCreateInput) {
  const entity = normalizeSceneTag(input)

  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.sceneTags.create(entity)
  }

  await mutateAppData((current) => ({
    ...current,
    sceneTags: [...current.sceneTags, entity],
  }))

  return entity
}

async function updateSceneTag(input: SceneTagUpdateInput) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    const entity = await desktopRepository.sceneTags.update(input)

    if (!entity) {
      throw new Error(`Entity not found: ${input.id}`)
    }

    return entity
  }

  let entity: SceneTag | null = null

  await mutateAppData((current) => {
    const result = updateById(current.sceneTags, input, (item, updates) => ({
      ...item,
      ...updates,
      updatedAt: updates.updatedAt ?? nowIso(),
    }))
    entity = result.entity

    return {
      ...current,
      sceneTags: result.collection,
    }
  })

  if (!entity) {
    throw new Error(`Entity not found: ${input.id}`)
  }

  return entity
}

async function deleteSceneTag(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.sceneTags.delete(id)
  }

  let removed = false

  await mutateAppData((current) => {
    const result = removeById(current.sceneTags, id)
    removed = result.removed

    return {
      ...current,
      sceneTags: result.collection,
    }
  })

  return removed
}

async function deleteSceneTagAndDetachTemplates(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.sceneTags.deleteAndDetachTemplates(id)
  }

  let removed = false

  await mutateAppData((current) => {
    const result = removeById(current.sceneTags, id)
    removed = result.removed

    if (!removed) {
      return current
    }

    return {
      ...current,
      sceneTags: result.collection,
      taskTemplates: current.taskTemplates.map((template) =>
        template.sceneTagIds.includes(id)
          ? {
              ...template,
              sceneTagIds: template.sceneTagIds.filter((sceneTagId) => sceneTagId !== id),
              updatedAt: nowIso(),
            }
          : template,
      ),
    }
  })

  return removed
}

async function listActivityTypes() {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.activityTypes.list()
  }

  return (await getAppData()).activityTypes
}

async function getActivityTypeById(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.activityTypes.getById(id)
  }

  return (await listActivityTypes()).find((item) => item.id === id) ?? null
}

async function createActivityType(input: ActivityTypeCreateInput) {
  const entity = normalizeActivityType(input)

  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.activityTypes.create(entity)
  }

  await mutateAppData((current) => ({
    ...current,
    activityTypes: [...current.activityTypes, entity],
  }))

  return entity
}

async function updateActivityType(input: ActivityTypeUpdateInput) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    const entity = await desktopRepository.activityTypes.update(input)

    if (!entity) {
      throw new Error(`Entity not found: ${input.id}`)
    }

    return entity
  }

  let entity: ActivityType | null = null

  await mutateAppData((current) => {
    const result = updateById(current.activityTypes, input, (item, updates) => ({
      ...item,
      ...updates,
      updatedAt: updates.updatedAt ?? nowIso(),
    }))
    entity = result.entity

    return {
      ...current,
      activityTypes: result.collection,
    }
  })

  if (!entity) {
    throw new Error(`Entity not found: ${input.id}`)
  }

  return entity
}

async function deleteActivityType(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.activityTypes.delete(id)
  }

  let removed = false

  await mutateAppData((current) => {
    const result = removeById(current.activityTypes, id)
    removed = result.removed

    return {
      ...current,
      activityTypes: result.collection,
    }
  })

  return removed
}

async function deleteActivityTypeIfUnused(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.activityTypes.deleteIfUnused(id)
  }

  const current = await getAppData()

  if (current.taskTemplates.some((template) => template.activityTypeId === id)) {
    return {
      removed: false,
      reason: 'in_use' as const,
    }
  }

  const removed = await deleteActivityType(id)

  return {
    removed,
    reason: removed ? null : ('not_found' as const),
  }
}

async function listTaskTemplates() {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.taskTemplates.list()
  }

  return (await getAppData()).taskTemplates
}

async function getTaskTemplateById(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.taskTemplates.getById(id)
  }

  return (await listTaskTemplates()).find((item) => item.id === id) ?? null
}

async function createTaskTemplate(input: TaskTemplateCreateInput) {
  const entity = normalizeTaskTemplate(input)

  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.taskTemplates.create(entity)
  }

  await mutateAppData((current) => ({
    ...current,
    taskTemplates: [...current.taskTemplates, entity],
  }))

  return entity
}

async function updateTaskTemplate(input: TaskTemplateUpdateInput) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    const existing = await desktopRepository.taskTemplates.getById(input.id)

    if (!existing) {
      throw new Error(`Entity not found: ${input.id}`)
    }

    const merged = {
      ...existing,
      ...input,
      updatedAt: input.updatedAt ?? nowIso(),
    }

    const next =
      merged.templateKind !== 'grass'
        ? {
            ...merged,
            grassStatus: undefined,
          }
        : (() => {
            const grassStatus = resolveGrassStatus(merged)

            return {
              ...merged,
              grassStatus,
              isArchived: grassStatus === 'archived',
            }
          })()

    const entity = await desktopRepository.taskTemplates.update(next)

    if (!entity) {
      throw new Error(`Entity not found: ${input.id}`)
    }

    return entity
  }

  let entity: TaskTemplate | null = null

  await mutateAppData((current) => {
    const result = updateById(current.taskTemplates, input, (item, updates) => ({
      ...(() => {
        const merged = {
          ...item,
          ...updates,
          updatedAt: updates.updatedAt ?? nowIso(),
        }

        if (merged.templateKind !== 'grass') {
          return {
            ...merged,
            grassStatus: undefined,
          }
        }

        const grassStatus = resolveGrassStatus(merged)

        return {
          ...merged,
          grassStatus,
          isArchived: grassStatus === 'archived',
        }
      })(),
    }))
    entity = result.entity

    return {
      ...current,
      taskTemplates: result.collection,
    }
  })

  if (!entity) {
    throw new Error(`Entity not found: ${input.id}`)
  }

  return entity
}

async function deleteTaskTemplate(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.taskTemplates.delete(id)
  }

  let removed = false

  await mutateAppData((current) => {
    const result = removeById(current.taskTemplates, id)
    removed = result.removed

    return {
      ...current,
      taskTemplates: result.collection,
    }
  })

  return removed
}

async function listRecurringTaskInstances() {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.recurringTaskInstances.list()
  }

  return (await getAppData()).recurringTaskInstances
}

async function getRecurringTaskInstanceById(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.recurringTaskInstances.getById(id)
  }

  return (await listRecurringTaskInstances()).find((item) => item.id === id) ?? null
}

async function createRecurringTaskInstance(input: RecurringTaskInstanceCreateInput) {
  const entity = normalizeRecurringTaskInstance(input)

  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.recurringTaskInstances.create(entity)
  }

  await mutateAppData((current) => ({
    ...current,
    recurringTaskInstances: [...current.recurringTaskInstances, entity],
  }))

  return entity
}

async function updateRecurringTaskInstance(input: RecurringTaskInstanceUpdateInput) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    const entity = await desktopRepository.recurringTaskInstances.update(input)

    if (!entity) {
      throw new Error(`Entity not found: ${input.id}`)
    }

    return entity
  }

  let entity: RecurringTaskInstance | null = null

  await mutateAppData((current) => {
    const result = updateById(current.recurringTaskInstances, input, (item, updates) => ({
      ...item,
      ...updates,
      updatedAt: updates.updatedAt ?? nowIso(),
    }))
    entity = result.entity

    return {
      ...current,
      recurringTaskInstances: result.collection,
    }
  })

  if (!entity) {
    throw new Error(`Entity not found: ${input.id}`)
  }

  return entity
}

async function deleteRecurringTaskInstance(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.recurringTaskInstances.delete(id)
  }

  let removed = false

  await mutateAppData((current) => {
    const result = removeById(current.recurringTaskInstances, id)
    removed = result.removed

    return {
      ...current,
      recurringTaskInstances: result.collection,
    }
  })

  return removed
}

async function listDayPlanItems() {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.dayPlanItems.list()
  }

  return (await getAppData()).dayPlanItems
}

async function getDayPlanItemById(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.dayPlanItems.getById(id)
  }

  return (await listDayPlanItems()).find((item) => item.id === id) ?? null
}

async function createDayPlanItem(input: DayPlanItemCreateInput) {
  const entity = normalizeDayPlanItem(input)

  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.dayPlanItems.create(entity)
  }

  await mutateAppData((current) => ({
    ...current,
    dayPlanItems: [...current.dayPlanItems, entity],
  }))

  return entity
}

async function updateDayPlanItem(input: DayPlanItemUpdateInput) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    const entity = await desktopRepository.dayPlanItems.update(input)

    if (!entity) {
      throw new Error(`Entity not found: ${input.id}`)
    }

    return entity
  }

  let entity: DayPlanItem | null = null

  await mutateAppData((current) => {
    const result = updateById(current.dayPlanItems, input, (item, updates) => ({
      ...item,
      ...updates,
      updatedAt: updates.updatedAt ?? nowIso(),
    }))
    entity = result.entity

    return {
      ...current,
      dayPlanItems: result.collection,
    }
  })

  if (!entity) {
    throw new Error(`Entity not found: ${input.id}`)
  }

  return entity
}

async function deleteDayPlanItem(id: string) {
  const desktopRepository = getDesktopRepositoryApi()

  if (desktopRepository) {
    return desktopRepository.dayPlanItems.delete(id)
  }

  let removed = false

  await mutateAppData((current) => {
    const result = removeById(current.dayPlanItems, id)
    removed = result.removed

    return {
      ...current,
      dayPlanItems: result.collection,
    }
  })

  return removed
}

async function getLocalSyncState(): Promise<LocalSyncState | null> {
  if (!isDesktopStorageEnabled()) {
    return null
  }

  return getDesktopLocalSyncState()
}

async function listLocalSyncChanges(): Promise<SyncChange[]> {
  if (!isDesktopStorageEnabled()) {
    return []
  }

  return listDesktopSyncChanges()
}

async function chooseLocalSyncTargetPath(): Promise<string | null> {
  if (!isDesktopStorageEnabled()) {
    return null
  }

  return chooseDesktopSyncTargetPath()
}

async function setLocalSyncTargetPath(targetPath: string): Promise<LocalSyncState | null> {
  if (!isDesktopStorageEnabled()) {
    return null
  }

  return setDesktopSyncTargetPath(targetPath)
}

async function clearLocalSyncTargetPath(): Promise<LocalSyncState | null> {
  if (!isDesktopStorageEnabled()) {
    return null
  }

  return clearDesktopSyncTargetPath()
}

async function testLocalSyncTargetPath(targetPath?: string): Promise<SyncTargetTestResult | null> {
  if (!isDesktopStorageEnabled()) {
    return null
  }

  return testDesktopSyncTargetPath(targetPath)
}

async function exportLocalSyncChanges(): Promise<SyncExportResult | null> {
  if (!isDesktopStorageEnabled()) {
    return null
  }

  return exportDesktopLocalSyncChanges()
}

async function importRemoteSyncChanges(): Promise<SyncImportResult | null> {
  if (!isDesktopStorageEnabled()) {
    return null
  }

  return importDesktopRemoteSyncChanges()
}

export const appDataStorage = {
  initialize: initializeAppData,
  get: getAppData,
  exportSnapshot: exportAppDataSnapshot,
  importSnapshot: importAppDataSnapshot,
  replace: replaceAppData,
  update: updateAppData,
  reset: resetAppData,
}

export const appDataRepository = {
  get: getAppData,
  exportSnapshot: exportAppDataSnapshot,
  importSnapshot: importAppDataSnapshot,
  replace: replaceAppData,
  update: updateAppData,
  reset: resetAppData,
  settings: {
    update: updateSettings,
  },
  sceneTags: {
    list: listSceneTags,
    getById: getSceneTagById,
    create: createSceneTag,
    update: updateSceneTag,
    delete: deleteSceneTag,
    deleteAndDetachTemplates: deleteSceneTagAndDetachTemplates,
  },
  activityTypes: {
    list: listActivityTypes,
    getById: getActivityTypeById,
    create: createActivityType,
    update: updateActivityType,
    delete: deleteActivityType,
    deleteIfUnused: deleteActivityTypeIfUnused,
  },
  taskTemplates: {
    list: listTaskTemplates,
    getById: getTaskTemplateById,
    create: createTaskTemplate,
    update: updateTaskTemplate,
    delete: deleteTaskTemplate,
  },
  recurringTaskInstances: {
    list: listRecurringTaskInstances,
    getById: getRecurringTaskInstanceById,
    create: createRecurringTaskInstance,
    update: updateRecurringTaskInstance,
    delete: deleteRecurringTaskInstance,
  },
  dayPlanItems: {
    list: listDayPlanItems,
    getById: getDayPlanItemById,
    create: createDayPlanItem,
    update: updateDayPlanItem,
    delete: deleteDayPlanItem,
  },
  sync: {
    getState: getLocalSyncState,
    chooseTargetPath: chooseLocalSyncTargetPath,
    openTargetPath: openDesktopSyncTargetPath,
    setTargetPath: setLocalSyncTargetPath,
    clearTargetPath: clearLocalSyncTargetPath,
    testTargetPath: testLocalSyncTargetPath,
    exportLocalChanges: exportLocalSyncChanges,
    importRemoteChanges: importRemoteSyncChanges,
    syncNow: runDesktopManualSync,
    listChanges: listLocalSyncChanges,
  },
  lifecycle: {
    prepareCurrentDayState: prepareDesktopCurrentDayState,
  },
}

export type {
  ActivityTypeCreateInput,
  ActivityTypeUpdateInput,
  DayPlanItemCreateInput,
  DayPlanItemUpdateInput,
  RecurringTaskInstanceCreateInput,
  RecurringTaskInstanceUpdateInput,
  SceneTagCreateInput,
  SceneTagUpdateInput,
  TaskTemplateCreateInput,
  TaskTemplateUpdateInput,
  AppSettingsUpdateInput,
}

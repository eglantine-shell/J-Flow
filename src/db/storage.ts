import { db } from '@/db/client'
import {
  APP_DATA_RECORD_ID,
  APP_DATA_SCHEMA_VERSION,
  appDataRecordSchema,
  appDataSchema,
  type AppDataRecord,
} from '@/db/schema'
import { mockSeedAppData } from '@/mocks'
import type {
  ActivityType,
  AppData,
  AppSettings,
  DayPlanItem,
  RecurringTaskInstance,
  SceneTag,
  TaskTemplate,
} from '@/types'

type AppDataUpdater = (current: AppData) => AppData

type SceneTagCreateInput = Omit<SceneTag, 'id' | 'createdAt'> &
  Partial<Pick<SceneTag, 'id' | 'createdAt'>>

type ActivityTypeCreateInput = Omit<ActivityType, 'id' | 'createdAt'> &
  Partial<Pick<ActivityType, 'id' | 'createdAt'>>

type TaskTemplateCreateInput = Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt' | 'date'> &
  Partial<Pick<TaskTemplate, 'id' | 'createdAt' | 'updatedAt' | 'date'>>

type RecurringTaskInstanceCreateInput = Omit<RecurringTaskInstance, 'id' | 'generatedAt'> &
  Partial<Pick<RecurringTaskInstance, 'id' | 'generatedAt'>>

type DayPlanItemCreateInput = Omit<DayPlanItem, 'id' | 'createdAt'> &
  Partial<Pick<DayPlanItem, 'id' | 'createdAt'>>

type SceneTagUpdateInput = Partial<Omit<SceneTag, 'id'>> & Pick<SceneTag, 'id'>
type ActivityTypeUpdateInput = Partial<Omit<ActivityType, 'id'>> & Pick<ActivityType, 'id'>
type TaskTemplateUpdateInput = Partial<Omit<TaskTemplate, 'id'>> & Pick<TaskTemplate, 'id'>
type RecurringTaskInstanceUpdateInput = Partial<Omit<RecurringTaskInstance, 'id'>> &
  Pick<RecurringTaskInstance, 'id'>
type DayPlanItemUpdateInput = Partial<Omit<DayPlanItem, 'id'>> & Pick<DayPlanItem, 'id'>
type AppSettingsUpdateInput = Partial<Omit<AppSettings, 'createdAt' | 'updatedAt'>>

const STORAGE_META_KEY = 'app_data_schema_version'

const cloneAppData = (appData: AppData): AppData => structuredClone(appData)

const nowIso = () => new Date().toISOString()

const pad = (value: number) => String(value).padStart(2, '0')

const todayDateString = () => {
  const now = new Date()

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const parseAppData = (appData: AppData) => appDataSchema.parse(cloneAppData(appData))

const buildRecord = (payload: AppData): AppDataRecord =>
  appDataRecordSchema.parse({
    id: APP_DATA_RECORD_ID,
    schemaVersion: APP_DATA_SCHEMA_VERSION,
    payload,
    updatedAt: nowIso(),
  })

async function readAppDataRecord() {
  const record = await db.appData.get(APP_DATA_RECORD_ID)

  if (!record) {
    return null
  }

  return appDataRecordSchema.parse(record)
}

async function persistAppData(appData: AppData) {
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
  const current = await getAppData()
  const next = mutator(cloneAppData(current))

  return persistAppData(next)
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
  return {
    id: input.id ?? createId('scene'),
    name: input.name,
    createdAt: input.createdAt ?? nowIso(),
    isBuiltIn: input.isBuiltIn,
  }
}

function normalizeActivityType(input: ActivityTypeCreateInput): ActivityType {
  return {
    id: input.id ?? createId('activity'),
    name: input.name,
    createdAt: input.createdAt ?? nowIso(),
    isBuiltIn: input.isBuiltIn,
  }
}

function normalizeTaskTemplate(input: TaskTemplateCreateInput): TaskTemplate {
  const timestamp = nowIso()

  return {
    id: input.id ?? createId('template'),
    title: input.title,
    date: input.date ?? todayDateString(),
    activityTypeId: input.activityTypeId,
    sceneTagIds: input.sceneTagIds,
    interestLevel: input.interestLevel,
    isNecessary: input.isNecessary,
    requiresPreparation: input.requiresPreparation,
    preparationNotes: input.preparationNotes,
    recurrence: input.recurrence,
    isSegmented: input.isSegmented,
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
    isArchived: input.isArchived,
  }
}

function normalizeRecurringTaskInstance(
  input: RecurringTaskInstanceCreateInput,
): RecurringTaskInstance {
  return {
    id: input.id ?? createId('recurring-instance'),
    templateId: input.templateId,
    dateKey: input.dateKey,
    recurrence: input.recurrence,
    status: input.status,
    progressState: input.progressState,
    progressPercent: input.progressPercent,
    progressNote: input.progressNote,
    generatedAt: input.generatedAt ?? nowIso(),
    completedAt: input.completedAt,
  }
}

function normalizeDayPlanItem(input: DayPlanItemCreateInput): DayPlanItem {
  return {
    id: input.id ?? createId('day-plan-item'),
    date: input.date,
    targetDate: input.targetDate,
    timeBlock: input.timeBlock,
    timeBlockSource: input.timeBlockSource,
    sortOrder: input.sortOrder,
    source: input.source,
    templateId: input.templateId,
    recurringInstanceId: input.recurringInstanceId,
    consumesDateTrigger: input.consumesDateTrigger,
    title: input.title,
    activityTypeId: input.activityTypeId,
    isNecessary: input.isNecessary,
    requiresPreparation: input.requiresPreparation,
    preparationNotes: input.preparationNotes,
    isSegmented: input.isSegmented,
    progressState: input.progressState,
    progressPercent: input.progressPercent,
    status: input.status,
    createdAt: input.createdAt ?? nowIso(),
    completedAt: input.completedAt,
  }
}

export async function initializeAppData(seed: AppData = mockSeedAppData) {
  await db.open()

  const existingRecord = await readAppDataRecord()

  if (existingRecord) {
    return cloneAppData(existingRecord.payload)
  }

  return persistAppData(seed)
}

export async function getAppData() {
  const existingRecord = await readAppDataRecord()

  if (existingRecord) {
    return cloneAppData(existingRecord.payload)
  }

  return initializeAppData()
}

export async function replaceAppData(appData: AppData) {
  return persistAppData(appData)
}

export async function updateAppData(updater: AppDataUpdater) {
  return mutateAppData(updater)
}

export async function resetAppData(seed: AppData = mockSeedAppData) {
  return persistAppData(seed)
}

async function updateSettings(input: AppSettingsUpdateInput) {
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
  return (await getAppData()).sceneTags
}

async function getSceneTagById(id: string) {
  return (await listSceneTags()).find((item) => item.id === id) ?? null
}

async function createSceneTag(input: SceneTagCreateInput) {
  const entity = normalizeSceneTag(input)

  await mutateAppData((current) => ({
    ...current,
    sceneTags: [...current.sceneTags, entity],
  }))

  return entity
}

async function updateSceneTag(input: SceneTagUpdateInput) {
  let entity: SceneTag | null = null

  await mutateAppData((current) => {
    const result = updateById(current.sceneTags, input)
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
  return (await getAppData()).activityTypes
}

async function getActivityTypeById(id: string) {
  return (await listActivityTypes()).find((item) => item.id === id) ?? null
}

async function createActivityType(input: ActivityTypeCreateInput) {
  const entity = normalizeActivityType(input)

  await mutateAppData((current) => ({
    ...current,
    activityTypes: [...current.activityTypes, entity],
  }))

  return entity
}

async function updateActivityType(input: ActivityTypeUpdateInput) {
  let entity: ActivityType | null = null

  await mutateAppData((current) => {
    const result = updateById(current.activityTypes, input)
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
  return (await getAppData()).taskTemplates
}

async function getTaskTemplateById(id: string) {
  return (await listTaskTemplates()).find((item) => item.id === id) ?? null
}

async function createTaskTemplate(input: TaskTemplateCreateInput) {
  const entity = normalizeTaskTemplate(input)

  await mutateAppData((current) => ({
    ...current,
    taskTemplates: [...current.taskTemplates, entity],
  }))

  return entity
}

async function updateTaskTemplate(input: TaskTemplateUpdateInput) {
  let entity: TaskTemplate | null = null

  await mutateAppData((current) => {
    const result = updateById(current.taskTemplates, input, (item, updates) => ({
      ...item,
      ...updates,
      updatedAt: updates.updatedAt ?? nowIso(),
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
  return (await getAppData()).recurringTaskInstances
}

async function getRecurringTaskInstanceById(id: string) {
  return (await listRecurringTaskInstances()).find((item) => item.id === id) ?? null
}

async function createRecurringTaskInstance(input: RecurringTaskInstanceCreateInput) {
  const entity = normalizeRecurringTaskInstance(input)

  await mutateAppData((current) => ({
    ...current,
    recurringTaskInstances: [...current.recurringTaskInstances, entity],
  }))

  return entity
}

async function updateRecurringTaskInstance(input: RecurringTaskInstanceUpdateInput) {
  let entity: RecurringTaskInstance | null = null

  await mutateAppData((current) => {
    const result = updateById(current.recurringTaskInstances, input)
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
  return (await getAppData()).dayPlanItems
}

async function getDayPlanItemById(id: string) {
  return (await listDayPlanItems()).find((item) => item.id === id) ?? null
}

async function createDayPlanItem(input: DayPlanItemCreateInput) {
  const entity = normalizeDayPlanItem(input)

  await mutateAppData((current) => ({
    ...current,
    dayPlanItems: [...current.dayPlanItems, entity],
  }))

  return entity
}

async function updateDayPlanItem(input: DayPlanItemUpdateInput) {
  let entity: DayPlanItem | null = null

  await mutateAppData((current) => {
    const result = updateById(current.dayPlanItems, input)
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

export const appDataStorage = {
  initialize: initializeAppData,
  get: getAppData,
  replace: replaceAppData,
  update: updateAppData,
  reset: resetAppData,
}

export const appDataRepository = {
  get: getAppData,
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

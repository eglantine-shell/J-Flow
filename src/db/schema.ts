import { z } from 'zod'

import {
  PROGRESS_PERCENT_MAX,
  PROGRESS_PERCENT_MIN,
  type ActivityType,
  type AppData,
  type AppSettings,
  type DayPlanItem,
  type LogbookEntry,
  type LogbookSnapshotItem,
  type RecurringTaskInstance,
  type SegmentedProgressLog,
  type SceneTag,
  type TaskTemplate,
} from '@/types'

const isoDatetimeSchema = z.string().datetime({ offset: true })
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date')
const templateDateSchema = z.union([dateSchema, z.literal('')])

const progressPercentSchema = z
  .number()
  .min(PROGRESS_PERCENT_MIN)
  .max(PROGRESS_PERCENT_MAX)
const grassStatusSchema = z.enum(['active', 'picked', 'archived'])
const repeatTypeSchema = z.enum(['none', 'calendar', 'afterCompletion'])
const repeatIntervalUnitSchema = z.enum(['day', 'week', 'month', 'year'])
const repeatIntervalValueSchema = z.number().int().min(1).max(100)
const timeBlockSchema = z.enum(['day', 'night'])
const timeBlockSourceSchema = z.enum([
  'mapped_day',
  'default_day',
  'mapped_night',
  'manual_night',
])

export const sceneTagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
  isBuiltIn: z.boolean(),
}) satisfies z.ZodType<SceneTag>

export const activityTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
  isBuiltIn: z.boolean(),
}) satisfies z.ZodType<ActivityType>

export const taskTemplateSchema = z.object({
  id: z.string().min(1),
  templateKind: z.enum(['grass', 'todo_recurring']).default('grass'),
  title: z.string().min(1),
  date: templateDateSchema,
  deadlineDate: dateSchema.optional(),
  timeBlock: timeBlockSchema.default('day'),
  timeBlockSource: timeBlockSourceSchema.default('default_day'),
  activityTypeId: z.string().min(1).optional(),
  sceneTagIds: z.array(z.string().min(1)),
  interestLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  isNecessary: z.boolean(),
  requiresPreparation: z.boolean(),
  preparationNotes: z.string(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
  repeatType: repeatTypeSchema.optional(),
  repeatIntervalUnit: repeatIntervalUnitSchema.optional(),
  repeatIntervalValue: repeatIntervalValueSchema.optional(),
  isSegmented: z.boolean(),
  isStepped: z.boolean(),
  currentStep: z.string(),
  nextStep: z.string(),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
  grassStatus: grassStatusSchema.optional(),
  isArchived: z.boolean(),
}).superRefine((template, context) => {
  if (template.templateKind === 'grass' && !template.activityTypeId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['activityTypeId'],
      message: 'grass templates require activityTypeId',
    })
  }

  if (template.isNecessary && !template.deadlineDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deadlineDate'],
      message: 'necessary templates require deadlineDate',
    })
  }
})

export const recurringTaskInstanceSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  dateKey: z.string().min(1),
  targetDate: dateSchema.optional(),
  recurrence: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  repeatType: z.enum(['calendar', 'afterCompletion']).optional(),
  repeatIntervalUnit: repeatIntervalUnitSchema.optional(),
  repeatIntervalValue: repeatIntervalValueSchema.optional(),
  status: z.enum(['pending', 'completed', 'expired']),
  progressState: z.enum(['not_started', 'in_progress', 'completed']),
  progressPercent: progressPercentSchema,
  progressNote: z.string(),
  generatedAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
  completedAt: isoDatetimeSchema.optional(),
}) satisfies z.ZodType<RecurringTaskInstance>

export const dayPlanItemSchema = z.object({
  id: z.string().min(1),
  date: dateSchema,
  originDate: dateSchema.optional(),
  targetDate: dateSchema.optional(),
  deadlineDate: dateSchema.optional(),
  timeBlock: timeBlockSchema,
  timeBlockSource: timeBlockSourceSchema,
  sortOrder: z.number(),
  source: z.enum(['auto_generated', 'decision_selected', 'manual_temporary']),
  templateId: z.string().min(1).optional(),
  recurringInstanceId: z.string().min(1).optional(),
  consumesDateTrigger: z.boolean().optional(),
  rootItemId: z.string().min(1).optional(),
  continuationOfItemId: z.string().min(1).optional(),
  carriedFromDate: dateSchema.optional(),
  title: z.string().min(1),
  activityTypeId: z.string().min(1).optional(),
  isNecessary: z.boolean(),
  requiresPreparation: z.boolean(),
  preparationNotes: z.string(),
  isSegmented: z.boolean(),
  isStepped: z.boolean(),
  currentStep: z.string(),
  nextStep: z.string(),
  stepRootItemId: z.string().min(1).optional(),
  previousStepItemId: z.string().min(1).optional(),
  progressState: z.enum(['not_started', 'in_progress', 'completed']),
  progressPercent: progressPercentSchema,
  status: z.enum(['pending', 'completed', 'deleted']),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
  completedAt: isoDatetimeSchema.optional(),
  deletedAt: isoDatetimeSchema.optional(),
}).superRefine((item, context) => {
  if (item.isNecessary && !item.deadlineDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deadlineDate'],
      message: 'necessary day plan items require deadlineDate',
    })
  }
}) satisfies z.ZodType<DayPlanItem>

const legacyLogbookCompletedItemSchema = z.object({
  id: z.string().min(1),
  titleSnapshot: z.string().min(1),
  time: z.string().regex(/^\d{2}[:：]\d{2}$/),
  kind: z.enum(['completed', 'picked']),
  isNecessary: z.boolean(),
})

const legacyLogbookUnfinishedItemSchema = z.object({
  id: z.string().min(1),
  titleSnapshot: z.string().min(1),
  isNecessary: z.boolean(),
  progressPercent: progressPercentSchema.optional(),
})

const legacyLogbookDeletedItemSchema = z.object({
  id: z.string().min(1),
  titleSnapshot: z.string().min(1),
  isNecessary: z.boolean(),
})

export const logbookSnapshotItemSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['completed', 'pending', 'deleted']),
  titleSnapshot: z.string().min(1),
  time: z.string().regex(/^(\d{4}|\d{2}[:：]\d{2})$/).optional(),
  isNecessary: z.boolean(),
  isPicked: z.boolean(),
  isSegmented: z.boolean(),
  progressText: z.string().min(1).optional(),
  deadlineDate: dateSchema.optional(),
  deadlineStatus: z.enum(['none', 'normal', 'overdue']),
}).superRefine((item, context) => {
  if (item.status === 'completed' && !item.time) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['time'],
      message: 'completed logbook snapshot items require time',
    })
  }

  if (item.deadlineStatus !== 'none' && !item.deadlineDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deadlineDate'],
      message: 'deadline snapshot items require deadlineDate',
    })
  }

  if (item.deadlineStatus === 'none' && item.deadlineDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deadlineStatus'],
      message: 'deadlineDate requires a non-none deadlineStatus',
    })
  }
}) satisfies z.ZodType<LogbookSnapshotItem>

export const segmentedProgressLogSchema = z.object({
  date: dateSchema,
  itemId: z.string().min(1),
  titleSnapshot: z.string().min(1),
  isNecessary: z.boolean(),
  fromProgress: progressPercentSchema,
  toProgress: progressPercentSchema,
}) satisfies z.ZodType<SegmentedProgressLog>

export const logbookEntrySchema = z.object({
  date: dateSchema,
  snapshotItems: z.array(logbookSnapshotItemSchema),
  remark: z.string(),
  generatedAt: isoDatetimeSchema,
}).or(
  z.object({
    date: dateSchema,
    completedItems: z.array(legacyLogbookCompletedItemSchema),
    unfinishedItems: z.array(legacyLogbookUnfinishedItemSchema),
    deletedItems: z.array(legacyLogbookDeletedItemSchema),
    remark: z.string(),
    generatedAt: isoDatetimeSchema,
  }).transform((entry) => ({
    date: entry.date,
    snapshotItems: [
      ...entry.completedItems.map((item) => ({
        id: item.id,
        status: 'completed' as const,
        titleSnapshot: item.titleSnapshot,
        time: item.time.replace(':', '').replace('：', ''),
        isNecessary: item.isNecessary,
        isPicked: item.kind === 'picked',
        isSegmented: false,
        deadlineStatus: 'none' as const,
      })),
      ...entry.unfinishedItems.map((item) => ({
        id: item.id,
        status: 'pending' as const,
        titleSnapshot: item.titleSnapshot,
        isNecessary: item.isNecessary,
        isPicked: false,
        isSegmented: false,
        deadlineStatus: 'none' as const,
      })),
      ...entry.deletedItems.map((item) => ({
        id: item.id,
        status: 'deleted' as const,
        titleSnapshot: item.titleSnapshot,
        isNecessary: item.isNecessary,
        isPicked: false,
        isSegmented: false,
        deadlineStatus: 'none' as const,
      })),
    ],
    remark: entry.remark,
    generatedAt: entry.generatedAt,
  })),
) satisfies z.ZodType<LogbookEntry>

export const appSettingsSchema = z.object({
  initialized: z.boolean(),
  tieBreakerOrder: z.enum(['asc', 'desc']),
  weatherEnabled: z.boolean(),
  completedAtRoundingMinutes: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(10),
    z.literal(30),
  ]),
  defaultNightTodoByTimeEnabled: z.boolean(),
  defaultNightTodoStartHour: z.number().int().min(0).max(23),
  defaultNightTodoEndHour: z.number().int().min(0).max(23),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
}) satisfies z.ZodType<AppSettings>

export const appDataSchema = z.object({
  settings: appSettingsSchema,
  sceneTags: z.array(sceneTagSchema),
  activityTypes: z.array(activityTypeSchema),
  taskTemplates: z.array(taskTemplateSchema),
  recurringTaskInstances: z.array(recurringTaskInstanceSchema),
  dayPlanItems: z.array(dayPlanItemSchema),
  logbookEntries: z.array(logbookEntrySchema),
  segmentedProgressLogs: z.array(segmentedProgressLogSchema),
})

export const APP_DATA_RECORD_ID = 'app-data'
export const APP_DATA_SCHEMA_VERSION = 13

export const appDataRecordSchema = z.object({
  id: z.literal(APP_DATA_RECORD_ID),
  schemaVersion: z.number().int().positive(),
  payload: appDataSchema,
  updatedAt: isoDatetimeSchema,
})

export type AppDataRecord = z.infer<typeof appDataRecordSchema>

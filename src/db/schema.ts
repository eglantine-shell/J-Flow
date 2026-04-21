import { z } from 'zod'

import {
  PROGRESS_PERCENT_MAX,
  PROGRESS_PERCENT_MIN,
  type ActivityType,
  type AppData,
  type AppSettings,
  type DayPlanItem,
  type RecurringTaskInstance,
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

export const sceneTagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: isoDatetimeSchema,
  isBuiltIn: z.boolean(),
}) satisfies z.ZodType<SceneTag>

export const activityTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: isoDatetimeSchema,
  isBuiltIn: z.boolean(),
}) satisfies z.ZodType<ActivityType>

export const taskTemplateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  date: templateDateSchema,
  activityTypeId: z.string().min(1),
  sceneTagIds: z.array(z.string().min(1)),
  interestLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  isNecessary: z.boolean(),
  requiresPreparation: z.boolean(),
  preparationNotes: z.string(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
  isSegmented: z.boolean(),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
  isArchived: z.boolean(),
}) satisfies z.ZodType<TaskTemplate>

export const recurringTaskInstanceSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  dateKey: z.string().min(1),
  recurrence: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  status: z.enum(['pending', 'completed', 'expired']),
  progressState: z.enum(['not_started', 'in_progress', 'completed']),
  progressPercent: progressPercentSchema,
  progressNote: z.string(),
  generatedAt: isoDatetimeSchema,
  completedAt: isoDatetimeSchema.optional(),
}) satisfies z.ZodType<RecurringTaskInstance>

export const dayPlanItemSchema = z.object({
  id: z.string().min(1),
  date: dateSchema,
  targetDate: dateSchema.optional(),
  timeBlock: z.enum(['day', 'night']),
  timeBlockSource: z.enum([
    'mapped_day',
    'default_day',
    'mapped_night',
    'manual_night',
  ]),
  sortOrder: z.number(),
  source: z.enum(['auto_generated', 'decision_selected', 'manual_temporary']),
  templateId: z.string().min(1).optional(),
  recurringInstanceId: z.string().min(1).optional(),
  consumesDateTrigger: z.boolean().optional(),
  title: z.string().min(1),
  activityTypeId: z.string().min(1).optional(),
  isNecessary: z.boolean(),
  requiresPreparation: z.boolean(),
  preparationNotes: z.string(),
  isSegmented: z.boolean(),
  progressState: z.enum(['not_started', 'in_progress', 'completed']),
  progressPercent: progressPercentSchema,
  status: z.enum(['pending', 'completed', 'deleted']),
  createdAt: isoDatetimeSchema,
  completedAt: isoDatetimeSchema.optional(),
}) satisfies z.ZodType<DayPlanItem>

export const appSettingsSchema = z.object({
  initialized: z.boolean(),
  tieBreakerOrder: z.enum(['asc', 'desc']),
  weatherEnabled: z.boolean(),
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
}) satisfies z.ZodType<AppData>

export const APP_DATA_RECORD_ID = 'app-data'
export const APP_DATA_SCHEMA_VERSION = 1

export const appDataRecordSchema = z.object({
  id: z.literal(APP_DATA_RECORD_ID),
  schemaVersion: z.number().int().positive(),
  payload: appDataSchema,
  updatedAt: isoDatetimeSchema,
})

export type AppDataRecord = z.infer<typeof appDataRecordSchema>

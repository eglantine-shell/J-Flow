import { describe, expect, it } from 'vitest'

import type { DayPlanItem, TaskTemplate } from '@/types'

import {
  formatScheduledLabel,
  resolveTemplateTodoSchedule,
  shouldDisplayTemplateInManager,
} from '@/features/templates/template-manager-state'

const todayKey = '2026-04-30'

const createTemplate = (overrides: Partial<TaskTemplate> = {}): TaskTemplate => ({
  id: 'template-grass',
  templateKind: 'grass',
  title: '测试种草',
  date: '',
  activityTypeId: 'activity-reading',
  sceneTagIds: [],
  interestLevel: 2,
  isNecessary: false,
  requiresPreparation: false,
  preparationNotes: '',
  recurrence: 'none',
  isSegmented: false,
  createdAt: '2026-04-30T09:00:00.000Z',
  updatedAt: '2026-04-30T09:00:00.000Z',
  grassStatus: 'active',
  isArchived: false,
  ...overrides,
})

const createDayPlanItem = (overrides: Partial<DayPlanItem> = {}): DayPlanItem => ({
  id: 'day-item',
  date: todayKey,
  originDate: todayKey,
  timeBlock: 'day',
  timeBlockSource: 'default_day',
  sortOrder: 1,
  source: 'decision_selected',
  templateId: 'template-grass',
  title: '测试种草',
  activityTypeId: 'activity-reading',
  isNecessary: false,
  requiresPreparation: false,
  preparationNotes: '',
  isSegmented: false,
  progressState: 'not_started',
  progressPercent: 0,
  status: 'pending',
  createdAt: '2026-04-30T09:00:00.000Z',
  ...overrides,
})

describe('formatScheduledLabel', () => {
  it('formats the scheduled tag as month/day', () => {
    expect(formatScheduledLabel('2026-05-02')).toBe('已排在 5/2')
  })
})

describe('resolveTemplateTodoSchedule', () => {
  it('treats a template already scheduled today as today', () => {
    const schedule = resolveTemplateTodoSchedule(
      createTemplate({ grassStatus: 'picked' }),
      [createDayPlanItem({ timeBlock: 'night' })],
      todayKey,
    )

    expect(schedule.kind).toBe('today')
    expect(schedule.label).toBe('已排在 4/30')
    expect(schedule.item?.timeBlock).toBe('night')
  })

  it('prefers the nearest future pending todo over older non-today entries', () => {
    const schedule = resolveTemplateTodoSchedule(
      createTemplate({ grassStatus: 'picked' }),
      [
        createDayPlanItem({ id: 'past', date: '2026-04-28' }),
        createDayPlanItem({ id: 'future', date: '2026-05-02' }),
      ],
      todayKey,
    )

    expect(schedule.kind).toBe('other_day')
    expect(schedule.item?.id).toBe('future')
    expect(schedule.label).toBe('已排在 5/2')
  })
})

describe('shouldDisplayTemplateInManager', () => {
  it('keeps active grass templates visible even when not yet scheduled', () => {
    expect(shouldDisplayTemplateInManager(createTemplate(), [], todayKey)).toBe(true)
  })

  it('keeps picked grass templates visible when they still have an unfinished todo', () => {
    expect(
      shouldDisplayTemplateInManager(
        createTemplate({ grassStatus: 'picked' }),
        [createDayPlanItem({ date: '2026-05-02' })],
        todayKey,
      ),
    ).toBe(true)
  })

  it('hides picked grass templates when they no longer have unfinished todos', () => {
    expect(
      shouldDisplayTemplateInManager(
        createTemplate({ grassStatus: 'picked' }),
        [],
        todayKey,
      ),
    ).toBe(false)
  })
})

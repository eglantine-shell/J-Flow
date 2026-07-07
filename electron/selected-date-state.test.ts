import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { prepareSelectedDateState } from './selected-date-state'
import { getSqliteAppData, replaceSqliteSnapshot } from './sqlite'
import { sqliteTestSeedAppData } from './test-fixtures'

const tempDirectories: string[] = []

const createTempDirectory = async (prefix: string) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix))
  tempDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true })
    }),
  )
})

describe('electron/selected-date-state', () => {
  it('creates recurring items for the selected date inside sqlite state', async () => {
    const dataPath = await createTempDirectory('j-flow-selected-date-')

    replaceSqliteSnapshot(dataPath, {
      ...sqliteTestSeedAppData,
      taskTemplates: [
        {
          id: 'template-recurring',
          templateKind: 'todo_recurring',
          title: '每周阅读',
          date: '2026-05-20',
          timeBlock: 'day',
          timeBlockSource: 'default_day',
          sceneTagIds: [],
          interestLevel: 2,
          isNecessary: false,
          requiresPreparation: false,
          preparationNotes: '',
          recurrence: 'weekly',
          repeatType: 'calendar',
          repeatIntervalUnit: 'week',
          repeatIntervalValue: 1,
          isSegmented: false,
          isStepped: false,
          currentStep: '',
          nextStep: '',
          createdAt: '2026-05-20T09:00:00.000Z',
          updatedAt: '2026-05-20T09:00:00.000Z',
          isArchived: false,
        },
      ],
    })

    const result = await prepareSelectedDateState(dataPath, '2026-05-27')
    const appData = getSqliteAppData(dataPath)
    const generatedItem = appData?.dayPlanItems.find((item) => item.targetDate === '2026-05-27')

    expect(result.updated).toBe(true)
    expect(generatedItem).toEqual(
      expect.objectContaining({
        source: 'auto_generated',
        templateId: 'template-recurring',
        date: '2026-05-27',
        targetDate: '2026-05-27',
        status: 'pending',
      }),
    )
  })

  it('uses recurring template time block instead of scene tag name mapping', async () => {
    const dataPath = await createTempDirectory('j-flow-selected-date-time-block-')

    replaceSqliteSnapshot(dataPath, {
      ...sqliteTestSeedAppData,
      taskTemplates: [
        {
          id: 'template-night-necessary',
          templateKind: 'todo_recurring',
          title: '夜间必要每日事项',
          date: '2026-05-20',
          deadlineDate: '2026-05-20',
          timeBlock: 'night',
          timeBlockSource: 'manual_night',
          sceneTagIds: ['scene-weekday-evening'],
          interestLevel: 2,
          isNecessary: true,
          requiresPreparation: false,
          preparationNotes: '',
          recurrence: 'daily',
          repeatType: 'calendar',
          repeatIntervalUnit: 'day',
          repeatIntervalValue: 1,
          isSegmented: false,
          isStepped: false,
          currentStep: '',
          nextStep: '',
          createdAt: '2026-05-20T09:00:00.000Z',
          updatedAt: '2026-05-20T09:00:00.000Z',
          isArchived: false,
        },
        {
          id: 'template-day-with-evening-tag',
          templateKind: 'todo_recurring',
          title: '白天但带工作日晚上标签',
          date: '2026-05-20',
          timeBlock: 'day',
          timeBlockSource: 'default_day',
          sceneTagIds: ['scene-weekday-evening'],
          interestLevel: 2,
          isNecessary: false,
          requiresPreparation: false,
          preparationNotes: '',
          recurrence: 'daily',
          repeatType: 'calendar',
          repeatIntervalUnit: 'day',
          repeatIntervalValue: 1,
          isSegmented: false,
          isStepped: false,
          currentStep: '',
          nextStep: '',
          createdAt: '2026-05-20T10:00:00.000Z',
          updatedAt: '2026-05-20T10:00:00.000Z',
          isArchived: false,
        },
      ],
    })

    const result = await prepareSelectedDateState(dataPath, '2026-05-21')
    const appData = getSqliteAppData(dataPath)
    const nightItem = appData?.dayPlanItems.find(
      (item) => item.templateId === 'template-night-necessary' && item.targetDate === '2026-05-21',
    )
    const dayItem = appData?.dayPlanItems.find(
      (item) => item.templateId === 'template-day-with-evening-tag' && item.targetDate === '2026-05-21',
    )

    expect(result.updated).toBe(true)
    expect(nightItem).toEqual(
      expect.objectContaining({
        timeBlock: 'night',
        timeBlockSource: 'manual_night',
        isNecessary: true,
        deadlineDate: '2026-05-21',
      }),
    )
    expect(dayItem).toEqual(
      expect.objectContaining({
        timeBlock: 'day',
        timeBlockSource: 'default_day',
      }),
    )
  })

  it('carries yesterday pending items into today when requested', async () => {
    const dataPath = await createTempDirectory('j-flow-selected-date-carryover-')

    replaceSqliteSnapshot(dataPath, {
      ...sqliteTestSeedAppData,
      dayPlanItems: [
        {
          id: 'carryover-1',
          date: '2026-05-25',
          originDate: '2026-05-25',
          timeBlock: 'day',
          timeBlockSource: 'default_day',
          sortOrder: 1,
          source: 'manual_temporary',
          rootItemId: 'carryover-1',
          title: '昨天没做完的事',
          isNecessary: false,
          requiresPreparation: false,
          preparationNotes: '',
          isSegmented: false,
          progressState: 'not_started',
          progressPercent: 0,
          status: 'pending',
          createdAt: '2026-05-25T09:00:00.000Z',
          updatedAt: '2026-05-25T09:00:00.000Z',
        },
      ],
    })

    const result = await prepareSelectedDateState(dataPath, '2026-05-26', {
      includeCarryovers: true,
    })
    const appData = getSqliteAppData(dataPath)
    const carriedItem = appData?.dayPlanItems.find((item) => item.id === 'carryover-1')

    expect(result.updated).toBe(true)
    expect(carriedItem).toEqual(
      expect.objectContaining({
        date: '2026-05-26',
        originDate: '2026-05-25',
      }),
    )
  })
})

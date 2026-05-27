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

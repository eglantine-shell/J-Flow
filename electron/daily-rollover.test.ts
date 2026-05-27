import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { maybeRunDailyRollover } from './daily-rollover'
import {
  getSqliteAppData,
  getSqliteLastDailyRolloverDate,
  replaceSqliteSnapshot,
} from './sqlite'
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

describe('electron/daily-rollover', () => {
  it('creates the previous day log and prepares today only once per day', async () => {
    const dataPath = await createTempDirectory('j-flow-daily-rollover-')

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

    const firstResult = await maybeRunDailyRollover(
      dataPath,
      new Date('2026-05-26T09:00:00.000Z'),
    )
    const secondResult = await maybeRunDailyRollover(
      dataPath,
      new Date('2026-05-26T10:00:00.000Z'),
    )
    const appData = getSqliteAppData(dataPath)
    const carriedItem = appData?.dayPlanItems.find((item) => item.id === 'carryover-1')

    expect(firstResult).toEqual(
      expect.objectContaining({
        triggered: true,
        todayKey: '2026-05-26',
        logbookResult: expect.objectContaining({
          date: '2026-05-25',
        }),
        selectedDateResult: {
          updated: true,
          selectedDateKey: '2026-05-26',
        },
      }),
    )
    expect(secondResult).toEqual({
      triggered: false,
      skippedReason: 'already_prepared',
      todayKey: '2026-05-26',
    })
    expect(getSqliteLastDailyRolloverDate(dataPath)).toBe('2026-05-26')
    expect(appData?.logbookEntries.some((entry) => entry.date === '2026-05-25')).toBe(true)
    expect(carriedItem).toEqual(
      expect.objectContaining({
        date: '2026-05-26',
        originDate: '2026-05-25',
      }),
    )
  })
})

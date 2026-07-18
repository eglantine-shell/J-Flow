import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { ensurePreviousDayLogbook } from './daily-logbook'
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

describe('electron/daily-logbook', () => {
  it('creates the previous day logbook snapshot once from the current sqlite state', async () => {
    const dataPath = await createTempDirectory('j-flow-daily-logbook-')

    replaceSqliteSnapshot(dataPath, {
      ...sqliteTestSeedAppData,
      dayPlanItems: [
        {
          id: 'completed-1',
          date: '2026-05-25',
          originDate: '2026-05-25',
          timeBlock: 'day',
          timeBlockSource: 'default_day',
          sortOrder: 1,
          source: 'manual_temporary',
          title: '白天已完成事项',
          isNecessary: false,
          requiresPreparation: false,
          preparationNotes: '',
          isSegmented: false,
          isStepped: true,
          currentStep: '第一步',
          nextStep: '第二步',
          plannedSteps: ['第二步'],
          progressState: 'completed',
          progressPercent: 100,
          status: 'completed',
          createdAt: '2026-05-25T09:00:00.000Z',
          updatedAt: '2026-05-25T10:00:00.000Z',
          completedAt: '2026-05-25T10:00:00.000Z',
        },
        {
          id: 'pending-1',
          date: '2026-05-25',
          originDate: '2026-05-25',
          deadlineDate: '2026-05-25',
          timeBlock: 'night',
          timeBlockSource: 'manual_night',
          sortOrder: 2,
          source: 'decision_selected',
          title: '晚上未完成必要分次事项',
          isNecessary: true,
          requiresPreparation: false,
          preparationNotes: '',
          isSegmented: true,
          isStepped: false,
          currentStep: '',
          nextStep: '',
          plannedSteps: [],
          progressState: 'in_progress',
          progressPercent: 50,
          status: 'pending',
          createdAt: '2026-05-25T20:00:00.000Z',
          updatedAt: '2026-05-25T21:00:00.000Z',
        },
        {
          id: 'deleted-1',
          date: '2026-05-25',
          originDate: '2026-05-25',
          timeBlock: 'day',
          timeBlockSource: 'default_day',
          sortOrder: 3,
          source: 'manual_temporary',
          title: '删除的分步事项',
          isNecessary: false,
          requiresPreparation: false,
          preparationNotes: '',
          isSegmented: false,
          isStepped: true,
          currentStep: '收尾',
          nextStep: '',
          plannedSteps: [],
          progressState: 'not_started',
          progressPercent: 0,
          status: 'deleted',
          createdAt: '2026-05-25T20:30:00.000Z',
          updatedAt: '2026-05-25T21:30:00.000Z',
          deletedAt: '2026-05-25T21:30:00.000Z',
        },
      ],
      segmentedProgressLogs: [
        {
          date: '2026-05-25',
          itemId: 'pending-1',
          titleSnapshot: '晚上未完成必要分次事项',
          isNecessary: true,
          fromProgress: 30,
          toProgress: 50,
        },
      ],
    })

    const firstResult = ensurePreviousDayLogbook(dataPath, new Date('2026-05-26T09:00:00.000Z'))
    const secondResult = ensurePreviousDayLogbook(dataPath, new Date('2026-05-26T09:05:00.000Z'))
    const appData = getSqliteAppData(dataPath)

    expect(firstResult.created).toBe(true)
    expect(secondResult.created).toBe(false)
    expect(appData?.logbookEntries).toHaveLength(1)
    expect(appData?.logbookEntries[0]?.date).toBe('2026-05-25')
    expect(appData?.logbookEntries[0]?.snapshotItems).toEqual([
      expect.objectContaining({
        id: 'completed-1',
        status: 'completed',
        titleSnapshot: '白天已完成事项：第一步',
        time: '18:00',
      }),
      expect.objectContaining({
        id: 'pending-1',
        status: 'pending',
        isNecessary: true,
        isPicked: true,
        isSegmented: true,
        progressText: '已推进 30%→50%',
        deadlineDate: '2026-05-25',
        deadlineStatus: 'normal',
      }),
      expect.objectContaining({
        id: 'deleted-1',
        status: 'deleted',
        titleSnapshot: '删除的分步事项：收尾',
      }),
    ])
  })
})

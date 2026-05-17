import { describe, expect, it } from 'vitest'

import { buildLogbookEntryForDate } from '@/features/logbook/logbook-service'
import { mockSeedAppData } from '@/mocks'

describe('buildLogbookEntryForDate', () => {
  it('summarizes segmented progress inside unfinished items for the same day', () => {
    const entry = buildLogbookEntryForDate(
      {
        ...mockSeedAppData,
        dayPlanItems: [
          {
            id: 'segmented-item-1',
            date: '2026-05-14',
            originDate: '2026-05-14',
            timeBlock: 'day',
            timeBlockSource: 'default_day',
            sortOrder: 1,
            source: 'manual_temporary',
            title: '整理资料',
            isNecessary: false,
            requiresPreparation: false,
            preparationNotes: '',
            isSegmented: true,
            progressState: 'in_progress',
            progressPercent: 40,
            status: 'pending',
            createdAt: '2026-05-14T09:00:00.000Z',
          },
        ],
        segmentedProgressLogs: [
          {
            date: '2026-05-14',
            itemId: 'segmented-item-1',
            titleSnapshot: '整理资料',
            isNecessary: false,
            fromProgress: 20,
            toProgress: 40,
          },
        ],
      },
      '2026-05-14',
    )

    expect(entry.unfinishedItems).toEqual([
      {
        id: 'segmented-item-1',
        titleSnapshot: '推进 整理资料 20% -> 40%',
        isNecessary: false,
        progressPercent: 40,
      },
    ])
  })
})

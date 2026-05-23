import { describe, expect, it } from 'vitest'

import {
  buildLogbookEntryForDate,
  buildLogbookMarkdown,
} from '@/features/logbook/logbook-service'
import { mockSeedAppData } from '@/mocks'

describe('buildLogbookEntryForDate', () => {
  it('builds a single snapshot list with completed, pending, and deleted items', () => {
    const entry = buildLogbookEntryForDate(
      {
        ...mockSeedAppData,
        dayPlanItems: [
          {
            id: 'completed-overdue',
            date: '2026-05-13',
            originDate: '2026-05-13',
            deadlineDate: '2026-05-13',
            timeBlock: 'day',
            timeBlockSource: 'default_day',
            sortOrder: 1,
            source: 'manual_temporary',
            title: '逾期完成必要事项',
            isNecessary: true,
            requiresPreparation: false,
            preparationNotes: '',
            isSegmented: false,
            progressState: 'completed',
            progressPercent: 100,
            status: 'completed',
            createdAt: '2026-05-13T08:00:00.000Z',
            updatedAt: '2026-05-14T01:20:00.000Z',
            completedAt: '2026-05-14T01:20:00.000Z',
          },
          {
            id: 'picked-completed',
            date: '2026-05-14',
            originDate: '2026-05-14',
            timeBlock: 'day',
            timeBlockSource: 'default_day',
            sortOrder: 2,
            source: 'decision_selected',
            title: '已完成拔草事项',
            isNecessary: false,
            requiresPreparation: false,
            preparationNotes: '',
            isSegmented: false,
            progressState: 'completed',
            progressPercent: 100,
            status: 'completed',
            createdAt: '2026-05-14T08:00:00.000Z',
            updatedAt: '2026-05-14T08:30:00.000Z',
            completedAt: '2026-05-14T08:30:00.000Z',
          },
          {
            id: 'segmented-overdue-pending',
            date: '2026-05-14',
            originDate: '2026-05-14',
            deadlineDate: '2026-05-13',
            timeBlock: 'day',
            timeBlockSource: 'default_day',
            sortOrder: 1,
            source: 'manual_temporary',
            title: '未完成分次必要事项',
            isNecessary: true,
            requiresPreparation: false,
            preparationNotes: '',
            isSegmented: true,
            progressState: 'in_progress',
            progressPercent: 50,
            status: 'pending',
            createdAt: '2026-05-14T09:00:00.000Z',
            updatedAt: '2026-05-14T09:00:00.000Z',
          },
          {
            id: 'segmented-pending',
            date: '2026-05-14',
            originDate: '2026-05-14',
            timeBlock: 'day',
            timeBlockSource: 'default_day',
            sortOrder: 2,
            source: 'manual_temporary',
            title: '未完成分次事项',
            isNecessary: false,
            requiresPreparation: false,
            preparationNotes: '',
            isSegmented: true,
            progressState: 'in_progress',
            progressPercent: 10,
            status: 'pending',
            createdAt: '2026-05-14T09:10:00.000Z',
            updatedAt: '2026-05-14T09:10:00.000Z',
          },
          {
            id: 'plain-pending',
            date: '2026-05-14',
            originDate: '2026-05-14',
            deadlineDate: '2026-05-16',
            timeBlock: 'day',
            timeBlockSource: 'default_day',
            sortOrder: 3,
            source: 'manual_temporary',
            title: '未完成必要事项',
            isNecessary: true,
            requiresPreparation: false,
            preparationNotes: '',
            isSegmented: false,
            progressState: 'not_started',
            progressPercent: 0,
            status: 'pending',
            createdAt: '2026-05-14T09:20:00.000Z',
            updatedAt: '2026-05-14T09:20:00.000Z',
          },
          {
            id: 'deleted-segmented',
            date: '2026-05-14',
            originDate: '2026-05-14',
            timeBlock: 'day',
            timeBlockSource: 'default_day',
            sortOrder: 4,
            source: 'manual_temporary',
            title: '已删除分次事项',
            isNecessary: false,
            requiresPreparation: false,
            preparationNotes: '',
            isSegmented: true,
            progressState: 'in_progress',
            progressPercent: 40,
            status: 'deleted',
            createdAt: '2026-05-14T09:30:00.000Z',
            updatedAt: '2026-05-14T11:00:00.000Z',
            deletedAt: '2026-05-14T11:00:00.000Z',
          },
        ],
        segmentedProgressLogs: [
          {
            date: '2026-05-14',
            itemId: 'segmented-overdue-pending',
            titleSnapshot: '未完成分次必要事项',
            isNecessary: true,
            fromProgress: 30,
            toProgress: 50,
          },
        ],
      },
      '2026-05-14',
    )

    expect(entry.snapshotItems).toEqual([
      expect.objectContaining({
        id: 'completed-overdue',
        status: 'completed',
        time: '0920',
        deadlineStatus: 'overdue',
      }),
      expect.objectContaining({
        id: 'picked-completed',
        status: 'completed',
        time: '1630',
        isPicked: true,
      }),
      expect.objectContaining({
        id: 'segmented-overdue-pending',
        status: 'pending',
        progressText: '已推进 30%→50%',
        deadlineStatus: 'overdue',
      }),
      expect.objectContaining({
        id: 'segmented-pending',
        status: 'pending',
        progressText: '当前进度 10%',
      }),
      expect.objectContaining({
        id: 'plain-pending',
        status: 'pending',
        deadlineDate: '2026-05-16',
        deadlineStatus: 'normal',
      }),
      expect.objectContaining({
        id: 'deleted-segmented',
        status: 'deleted',
        isSegmented: true,
      }),
    ])
  })

  it('renders unified markdown lines with tags and deadline details', () => {
    const markdown = buildLogbookMarkdown({
      date: '2026-05-14',
      snapshotItems: [
        {
          id: 'completed-overdue',
          status: 'completed',
          titleSnapshot: '逾期完成必要事项',
          time: '1030',
          isNecessary: true,
          isPicked: false,
          isSegmented: false,
          deadlineDate: '2026-05-13',
          deadlineStatus: 'overdue',
        },
        {
          id: 'pending-segmented',
          status: 'pending',
          titleSnapshot: '未完成分次必要事项',
          isNecessary: true,
          isPicked: false,
          isSegmented: true,
          progressText: '已推进 30%→50%',
          deadlineDate: '2026-05-23',
          deadlineStatus: 'normal',
        },
        {
          id: 'deleted-picked',
          status: 'deleted',
          titleSnapshot: '已删除拔草事项',
          isNecessary: false,
          isPicked: true,
          isSegmented: false,
          deadlineStatus: 'none',
        },
      ],
      remark: '补一句备注',
      generatedAt: '2026-05-15T00:00:00.000Z',
    })

    expect(markdown).toContain('## 260514')
    expect(markdown).toContain('### 当日快照')
    expect(markdown).toContain('- [x] 1030 **逾期完成必要事项** [逾期]')
    expect(markdown).toContain('- [ ] **未完成分次必要事项** | 已推进 30%→50% | DDL 0523 [分次]')
    expect(markdown).toContain('- [x] ~~已删除拔草事项~~ [拔草]')
    expect(markdown).toContain('### 备注')
    expect(markdown).toContain('补一句备注')
  })
})

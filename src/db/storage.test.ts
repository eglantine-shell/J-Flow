import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockSeedAppData } from '@/mocks'

type TableRecord = Record<string, unknown>

class FakeTable<T extends TableRecord> {
  private records = new Map<string, T>()

  async get(key: string) {
    return this.records.get(key)
  }

  async put(record: T) {
    const key = String('id' in record ? record.id : record.key)
    this.records.set(key, structuredClone(record))
  }
}

vi.mock('@/db/client', () => {
  const appData = new FakeTable()
  const meta = new FakeTable()

  return {
    db: {
      appData,
      meta,
      async transaction(_mode: string, ...args: Array<unknown>) {
        const callback = args.at(-1)

        if (typeof callback !== 'function') {
          throw new Error('Missing transaction callback')
        }

        return callback()
      },
      async open() {
        return undefined
      },
    },
  }
})

describe('appDataRepository.taskTemplates.create', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('keeps earlier templates when multiple grass items are created sequentially', async () => {
    const { appDataRepository } = await import('@/db/storage')

    await appDataRepository.taskTemplates.create({
      templateKind: 'grass',
      date: '',
      activityTypeId: 'activity-reading',
      title: '第一条种草',
      sceneTagIds: ['scene-weekend'],
      interestLevel: 2,
      isNecessary: false,
      requiresPreparation: false,
      preparationNotes: '',
      recurrence: 'none',
      isSegmented: false,
      grassStatus: 'active',
      isArchived: false,
    })

    await appDataRepository.taskTemplates.create({
      templateKind: 'grass',
      date: '',
      activityTypeId: 'activity-reading',
      title: '第二条种草',
      sceneTagIds: ['scene-weekend'],
      interestLevel: 3,
      isNecessary: false,
      requiresPreparation: false,
      preparationNotes: '',
      recurrence: 'none',
      isSegmented: false,
      grassStatus: 'active',
      isArchived: false,
    })

    const templates = await appDataRepository.taskTemplates.list()

    expect(templates.map((template) => template.title)).toEqual([
      '第一条种草',
      '第二条种草',
    ])
  })

  it('preserves scene tags even if the caller mutates the original array later', async () => {
    const { appDataRepository } = await import('@/db/storage')
    const sceneTagIds = ['scene-weekend']

    const created = await appDataRepository.taskTemplates.create({
      templateKind: 'grass',
      date: '',
      activityTypeId: 'activity-reading',
      title: '共享场景数组测试',
      sceneTagIds,
      interestLevel: 2,
      isNecessary: false,
      requiresPreparation: false,
      preparationNotes: '',
      recurrence: 'none',
      isSegmented: false,
      grassStatus: 'active',
      isArchived: false,
    })

    sceneTagIds.push('scene-holiday')

    const persisted = await appDataRepository.taskTemplates.getById(created.id)

    expect(created.sceneTagIds).toEqual(['scene-weekend'])
    expect(persisted?.sceneTagIds).toEqual(['scene-weekend'])
  })

  it('defaults completedAt rounding to 5 minutes for legacy imports', async () => {
    const { appDataRepository } = await import('@/db/storage')

    const imported = await appDataRepository.importSnapshot({
      ...mockSeedAppData,
      settings: {
        ...mockSeedAppData.settings,
        completedAtRoundingMinutes: undefined,
      },
    } as unknown as typeof mockSeedAppData)

    expect(imported.settings.completedAtRoundingMinutes).toBe(5)
  })

  it('defaults logbook entries to an empty array for legacy imports', async () => {
    const { appDataRepository } = await import('@/db/storage')

    const imported = await appDataRepository.importSnapshot({
      ...mockSeedAppData,
      logbookEntries: undefined,
    } as unknown as typeof mockSeedAppData)

    expect(imported.logbookEntries).toEqual([])
  })

  it('accepts legacy logbook times written with a full-width colon', async () => {
    const { appDataRepository } = await import('@/db/storage')

    const imported = await appDataRepository.importSnapshot({
      ...mockSeedAppData,
      logbookEntries: [
        {
          date: '2026-05-04',
          completedItems: [
            {
              id: 'completed-1',
              titleSnapshot: '日志完成事项',
              time: '16：36',
              kind: 'completed',
              isNecessary: false,
            },
          ],
          unfinishedItems: [],
          deletedItems: [],
          remark: '',
          generatedAt: '2026-05-05T00:00:00.000Z',
        },
      ],
    })

    expect(imported.logbookEntries[0]?.snapshotItems[0]?.time).toBe('16:36')
  })

  it('normalizes legacy segmented logbook text into title and progress details', async () => {
    const { appDataRepository } = await import('@/db/storage')

    const imported = await appDataRepository.importSnapshot({
      ...mockSeedAppData,
      logbookEntries: [
        {
          date: '2026-05-04',
          completedItems: [],
          unfinishedItems: [
            {
              id: 'unfinished-progress-1',
              titleSnapshot: '整理资料 进度：81%',
              isNecessary: false,
            },
            {
              id: 'unfinished-progress-2',
              titleSnapshot: '推进 报销材料 30% -> 50%',
              isNecessary: true,
            },
          ],
          deletedItems: [],
          remark: '',
          generatedAt: '2026-05-05T00:00:00.000Z',
        },
      ],
    } as unknown as typeof mockSeedAppData)

    expect(imported.logbookEntries[0]?.snapshotItems).toEqual([
      expect.objectContaining({
        id: 'unfinished-progress-1',
        titleSnapshot: '整理资料',
        isSegmented: true,
        progressText: '当前进度 81%',
      }),
      expect.objectContaining({
        id: 'unfinished-progress-2',
        titleSnapshot: '报销材料',
        isSegmented: true,
        progressText: '已推进 30%→50%',
      }),
    ])
  })

  it('defaults segmented progress logs to an empty array for legacy imports', async () => {
    const { appDataRepository } = await import('@/db/storage')

    const imported = await appDataRepository.importSnapshot({
      ...mockSeedAppData,
      segmentedProgressLogs: undefined,
    } as unknown as typeof mockSeedAppData)

    expect(imported.segmentedProgressLogs).toEqual([])
  })

  it('defaults legacy necessary deadlines to the item or template date during import', async () => {
    const { appDataRepository } = await import('@/db/storage')

    const imported = await appDataRepository.importSnapshot({
      ...mockSeedAppData,
      taskTemplates: mockSeedAppData.taskTemplates.map((template) =>
        template.templateKind === 'todo_recurring' && template.isNecessary
          ? { ...template, deadlineDate: undefined }
          : template,
      ),
      dayPlanItems: mockSeedAppData.dayPlanItems.map((item) =>
        item.isNecessary ? { ...item, deadlineDate: undefined } : item,
      ),
    } as unknown as typeof mockSeedAppData)

    expect(
      imported.dayPlanItems
        .filter((item) => item.isNecessary)
        .every((item) => item.deadlineDate === item.date),
    ).toBe(true)
  })

  it('initializes missing updatedAt fields for legacy sync entities during import', async () => {
    const { appDataRepository } = await import('@/db/storage')

    const imported = await appDataRepository.importSnapshot({
      ...mockSeedAppData,
      sceneTags: mockSeedAppData.sceneTags.map(({ updatedAt: _updatedAt, ...sceneTag }) => sceneTag),
      activityTypes: mockSeedAppData.activityTypes.map(
        ({ updatedAt: _updatedAt, ...activityType }) => activityType,
      ),
      recurringTaskInstances: mockSeedAppData.recurringTaskInstances.map(
        ({ updatedAt: _updatedAt, ...instance }) => instance,
      ),
      dayPlanItems: mockSeedAppData.dayPlanItems.map(({ updatedAt: _updatedAt, ...item }) => item),
    } as unknown as typeof mockSeedAppData)

    expect(imported.sceneTags.every((sceneTag) => sceneTag.updatedAt === sceneTag.createdAt)).toBe(true)
    expect(
      imported.activityTypes.every((activityType) => activityType.updatedAt === activityType.createdAt),
    ).toBe(true)
    expect(
      imported.recurringTaskInstances.every(
        (instance) => instance.updatedAt === (instance.completedAt ?? instance.generatedAt),
      ),
    ).toBe(true)
    expect(
      imported.dayPlanItems.every(
        (item) => item.updatedAt === (item.deletedAt ?? item.completedAt ?? item.createdAt),
      ),
    ).toBe(true)
  })
})

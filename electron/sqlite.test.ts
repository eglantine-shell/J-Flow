import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  clearSqliteSyncTargetConfig,
  clearSqliteSyncTargetPath,
  createSqliteDayPlanItem,
  createSqliteSceneTag,
  createSqliteTaskTemplate,
  deleteSqliteActivityTypeIfUnused,
  deleteSqliteSceneTag,
  deleteSqliteSceneTagAndDetachTemplates,
  getSqliteAppData,
  getSqliteLocalSyncState,
  getSqliteTaskTemplateById,
  listSqliteSyncChanges,
  listSqliteDayPlanItems,
  replaceSqliteSnapshot,
  setSqliteSyncTargetConfig,
  setSqliteSyncTargetPath,
  updateSqliteSceneTag,
  updateSqliteDayPlanItem,
} from './sqlite'
import { sqliteTestSeedAppData } from './test-fixtures'

const tempDirectories: string[] = []

const createTempDataPath = async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'j-flow-sqlite-test-'))
  tempDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0, tempDirectories.length).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  )
})

describe('electron/sqlite', () => {
  it('replaces and reads back full app data snapshots', async () => {
    const dataPath = await createTempDataPath()
    const result = replaceSqliteSnapshot(dataPath, {
      ...sqliteTestSeedAppData,
      logbookEntries: [
        {
          date: '2026-05-01',
          snapshotItems: [
            {
              id: 'completed-1',
              status: 'completed',
              titleSnapshot: '完成事项',
              time: '10:30',
              isNecessary: true,
              isPicked: false,
              isSegmented: false,
              deadlineStatus: 'none',
            },
          ],
          remark: '测试备注',
          generatedAt: '2026-05-02T00:00:00.000Z',
        },
      ],
      segmentedProgressLogs: [
        {
          date: '2026-05-01',
          itemId: 'day-plan-item-1',
          titleSnapshot: '推进事项',
          isNecessary: false,
          fromProgress: 20,
          toProgress: 40,
        },
      ],
    })

    expect(result.ok).toBe(true)

    const appData = getSqliteAppData(dataPath)

    expect(appData?.settings.initialized).toBe(sqliteTestSeedAppData.settings.initialized)
    expect(appData?.sceneTags).toHaveLength(sqliteTestSeedAppData.sceneTags.length)
    expect(appData?.activityTypes).toHaveLength(sqliteTestSeedAppData.activityTypes.length)
    expect(appData?.logbookEntries).toHaveLength(1)
    expect(appData?.logbookEntries[0]?.remark).toBe('测试备注')
    expect(appData?.segmentedProgressLogs).toEqual([
      {
        date: '2026-05-01',
        itemId: 'day-plan-item-1',
        titleSnapshot: '推进事项',
        isNecessary: false,
        fromProgress: 20,
        toProgress: 40,
      },
    ])
  })

  it('accepts legacy logbook entries when replacing a full desktop snapshot', async () => {
    const dataPath = await createTempDataPath()
    const result = replaceSqliteSnapshot(dataPath, {
      ...sqliteTestSeedAppData,
      logbookEntries: [
        {
          date: '2026-05-01',
          completedItems: [
            {
              id: 'legacy-completed-1',
              titleSnapshot: '旧日志完成事项',
              time: '10：30',
              kind: 'completed',
              isNecessary: false,
            },
          ],
          unfinishedItems: [],
          deletedItems: [],
          remark: '',
          generatedAt: '2026-05-02T00:00:00.000Z',
        },
      ],
    } as unknown as typeof sqliteTestSeedAppData)

    expect(result.ok).toBe(true)
    expect(getSqliteAppData(dataPath)?.logbookEntries[0]?.snapshotItems).toEqual([
      expect.objectContaining({
        id: 'legacy-completed-1',
        status: 'completed',
        time: '10:30',
      }),
    ])
  })

  it('supports task template and day plan item CRUD on the SQLite repository', async () => {
    const dataPath = await createTempDataPath()
    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)

    const createdTemplate = createSqliteTaskTemplate(dataPath, {
      id: 'template-sqlite-test',
      templateKind: 'grass',
      title: 'SQLite 条目',
      date: '2026-05-01',
      activityTypeId: sqliteTestSeedAppData.activityTypes[0]?.id,
      sceneTagIds: [sqliteTestSeedAppData.sceneTags[0]?.id ?? 'scene-test'],
      interestLevel: 2,
      isNecessary: false,
      requiresPreparation: false,
      preparationNotes: '',
      recurrence: 'none',
      isSegmented: false,
      isStepped: true,
      currentStep: '第一章',
      nextStep: '第二章',
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
      grassStatus: 'active',
      isArchived: false,
    })

    expect(createdTemplate.title).toBe('SQLite 条目')
    expect(getSqliteTaskTemplateById(dataPath, createdTemplate.id)?.title).toBe('SQLite 条目')
    expect(getSqliteTaskTemplateById(dataPath, createdTemplate.id)?.currentStep).toBe('第一章')

    createSqliteDayPlanItem(dataPath, {
      id: 'day-plan-item-sqlite-test',
      date: '2026-05-01',
      originDate: '2026-05-01',
      timeBlock: 'day',
      timeBlockSource: 'default_day',
      sortOrder: 99,
      source: 'manual_temporary',
      title: 'SQLite Todo',
      activityTypeId: sqliteTestSeedAppData.activityTypes[0]?.id,
      isNecessary: false,
      requiresPreparation: false,
      preparationNotes: '',
      isSegmented: false,
      isStepped: true,
      currentStep: '第一章',
      nextStep: '第二章',
      stepRootItemId: 'day-plan-item-sqlite-test',
      progressState: 'not_started',
      progressPercent: 0,
      status: 'pending',
      createdAt: '2026-05-01T08:10:00.000Z',
    })

    const updatedDayPlanItem = updateSqliteDayPlanItem(dataPath, {
      id: 'day-plan-item-sqlite-test',
      nextStep: '第三章',
      status: 'deleted',
      deletedAt: '2026-05-01T09:00:00.000Z',
    })

    expect(updatedDayPlanItem?.status).toBe('deleted')
    expect(updatedDayPlanItem?.nextStep).toBe('第三章')
    expect(updatedDayPlanItem?.deletedAt).toBe('2026-05-01T09:00:00.000Z')
    expect(
      listSqliteDayPlanItems(dataPath).some(
        (item: { id: string }) => item.id === 'day-plan-item-sqlite-test',
      ),
    ).toBe(true)
  })

  it('deletes scene tags and detaches them from templates in one operation', async () => {
    const dataPath = await createTempDataPath()
    const sceneTagId = sqliteTestSeedAppData.sceneTags[0]?.id ?? 'scene-weekend'
    const activityTypeId = sqliteTestSeedAppData.activityTypes[0]?.id

    replaceSqliteSnapshot(dataPath, {
      ...sqliteTestSeedAppData,
      taskTemplates: [
        {
          id: 'template-with-scene-tag',
          templateKind: 'grass',
          title: '待解绑场景',
          date: '2026-05-01',
          activityTypeId,
          sceneTagIds: [sceneTagId],
          interestLevel: 1,
          isNecessary: false,
          requiresPreparation: false,
          preparationNotes: '',
          recurrence: 'none',
          isSegmented: false,
          createdAt: '2026-05-01T08:00:00.000Z',
          updatedAt: '2026-05-01T08:00:00.000Z',
          grassStatus: 'active',
          isArchived: false,
        },
      ],
    })

    expect(deleteSqliteSceneTagAndDetachTemplates(dataPath, sceneTagId)).toBe(true)
    expect(getSqliteTaskTemplateById(dataPath, 'template-with-scene-tag')?.sceneTagIds).toEqual([])
  })

  it('prevents deleting an activity type that is still used by templates', async () => {
    const dataPath = await createTempDataPath()
    const activityTypeId = sqliteTestSeedAppData.activityTypes[0]?.id ?? 'activity-test'

    replaceSqliteSnapshot(dataPath, {
      ...sqliteTestSeedAppData,
      taskTemplates: [
        {
          id: 'template-with-activity-type',
          templateKind: 'grass',
          title: '占用分类',
          date: '2026-05-01',
          activityTypeId,
          sceneTagIds: [],
          interestLevel: 1,
          isNecessary: false,
          requiresPreparation: false,
          preparationNotes: '',
          recurrence: 'none',
          isSegmented: false,
          createdAt: '2026-05-01T08:00:00.000Z',
          updatedAt: '2026-05-01T08:00:00.000Z',
          grassStatus: 'active',
          isArchived: false,
        },
      ],
    })

    expect(deleteSqliteActivityTypeIfUnused(dataPath, activityTypeId)).toEqual({
      removed: false,
      reason: 'in_use',
    })
  })

  it('generates a stable deviceId in local sync metadata', async () => {
    const dataPath = await createTempDataPath()
    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)

    const first = getSqliteLocalSyncState(dataPath)
    const second = getSqliteLocalSyncState(dataPath)

    expect(first.deviceId).toBeTruthy()
    expect(second.deviceId).toBe(first.deviceId)
    expect(first.lastSyncedAt).toBeNull()
    expect(first.lastSyncStatus).toBeNull()
    expect(first.lastSyncError).toBeNull()
    expect(first.lastSyncAttemptedAt).toBeNull()
    expect(first.lastSyncResult).toBeNull()
  })

  it('records sync_changes for upsert and delete mutations', async () => {
    const dataPath = await createTempDataPath()
    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)

    createSqliteSceneTag(dataPath, {
      id: 'scene-sync-test',
      name: '同步标签',
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
      isBuiltIn: false,
    })

    updateSqliteSceneTag(dataPath, {
      id: 'scene-sync-test',
      name: '同步标签-已改',
    })

    const upsertChange = listSqliteSyncChanges(dataPath).find(
      (item) => item.entityType === 'sceneTag' && item.entityId === 'scene-sync-test',
    )

    expect(upsertChange).toMatchObject({
      entityType: 'sceneTag',
      entityId: 'scene-sync-test',
      changeType: 'upsert',
    })

    deleteSqliteSceneTag(dataPath, 'scene-sync-test')

    const changes = listSqliteSyncChanges(dataPath)
    const change = changes.find((item) => item.entityType === 'sceneTag' && item.entityId === 'scene-sync-test')

    expect(change).toMatchObject({
      entityType: 'sceneTag',
      entityId: 'scene-sync-test',
      changeType: 'delete',
    })
    expect(change?.deviceId).toBe(getSqliteLocalSyncState(dataPath).deviceId)
    expect(change?.syncedAt).toBeNull()
  })

  it('persists and clears syncTargetPath in local sync metadata', async () => {
    const dataPath = await createTempDataPath()
    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)

    const saved = setSqliteSyncTargetPath(dataPath, '/tmp/j-flow-sync')
    expect(saved.syncTargetPath).toBe('/tmp/j-flow-sync')
    expect(getSqliteLocalSyncState(dataPath).syncTargetPath).toBe('/tmp/j-flow-sync')

    const cleared = clearSqliteSyncTargetPath(dataPath)
    expect(cleared.syncTargetPath).toBeNull()
    expect(getSqliteLocalSyncState(dataPath).syncTargetPath).toBeNull()
  })

  it('persists localFolder syncTargetConfig in local sync metadata', async () => {
    const dataPath = await createTempDataPath()
    replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)

    const saved = setSqliteSyncTargetConfig(dataPath, {
      type: 'localFolder',
      path: '/tmp/j-flow-sync-config',
    })

    expect(saved.syncTargetConfig).toEqual({
      type: 'localFolder',
      path: '/tmp/j-flow-sync-config',
    })
    expect(getSqliteLocalSyncState(dataPath).syncTargetConfig?.type).toBe('localFolder')

    const cleared = clearSqliteSyncTargetConfig(dataPath)
    expect(cleared.syncTargetConfig).toBeNull()
    expect(getSqliteLocalSyncState(dataPath).syncTargetConfig).toBeNull()
  })
})

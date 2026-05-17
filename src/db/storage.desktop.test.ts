import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockSeedAppData } from '@/mocks'

const createDesktopApi = () => {
  const appData = structuredClone(mockSeedAppData)

  return {
    repository: {
      appData: {
        get: vi.fn(async () => structuredClone(appData)),
        replace: vi.fn(async (nextAppData) => structuredClone(nextAppData)),
        reset: vi.fn(async (seed) => structuredClone(seed ?? mockSeedAppData)),
        exportSnapshot: vi.fn(async () => structuredClone(appData)),
        importSnapshot: vi.fn(async (nextAppData) => structuredClone(nextAppData)),
      },
      settings: {
        get: vi.fn(),
        update: vi.fn(),
      },
      sceneTags: {
        list: vi.fn(async () => structuredClone(appData.sceneTags)),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteAndDetachTemplates: vi.fn(),
      },
      activityTypes: {
        list: vi.fn(async () => structuredClone(appData.activityTypes)),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteIfUnused: vi.fn(),
      },
      taskTemplates: {
        list: vi.fn(async () => structuredClone(appData.taskTemplates)),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      recurringTaskInstances: {
        list: vi.fn(async () => structuredClone(appData.recurringTaskInstances)),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      dayPlanItems: {
        list: vi.fn(async () => structuredClone(appData.dayPlanItems)),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    getAppDataSnapshot: vi.fn(async () => ({
      appData: structuredClone(appData),
      revision: 1,
      databasePath: '/tmp/j-flow.sqlite3',
    })),
    replaceAppDataSnapshot: vi.fn(),
  }
}

describe('storage desktop app-data service', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses desktop appData service for get/export/import/reset/replace', async () => {
    const desktopApi = createDesktopApi()

    vi.stubGlobal('window', {
      jflowDesktop: desktopApi,
    })

    const {
      getAppData,
      exportAppDataSnapshot,
      importAppDataSnapshot,
      replaceAppData,
      resetAppData,
    } = await import('@/db/storage')

    const appData = await getAppData()
    const exported = await exportAppDataSnapshot()
    const imported = await importAppDataSnapshot(mockSeedAppData)
    const replaced = await replaceAppData(mockSeedAppData)
    const reset = await resetAppData(mockSeedAppData)

    expect(appData.settings).toEqual(mockSeedAppData.settings)
    expect(exported.settings).toEqual(mockSeedAppData.settings)
    expect(imported.settings).toEqual(mockSeedAppData.settings)
    expect(replaced.settings).toEqual(mockSeedAppData.settings)
    expect(reset.settings).toEqual(mockSeedAppData.settings)

    expect(desktopApi.repository.appData.get).toHaveBeenCalledTimes(1)
    expect(desktopApi.repository.appData.exportSnapshot).toHaveBeenCalledTimes(1)
    expect(desktopApi.repository.appData.importSnapshot).toHaveBeenCalledTimes(1)
    expect(desktopApi.repository.appData.replace).toHaveBeenCalledTimes(1)
    expect(desktopApi.repository.appData.reset).toHaveBeenCalledTimes(1)
    expect(desktopApi.getAppDataSnapshot).not.toHaveBeenCalled()
    expect(desktopApi.replaceAppDataSnapshot).not.toHaveBeenCalled()
  })
})

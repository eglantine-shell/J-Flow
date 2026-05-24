const { contextBridge, ipcRenderer } = require('electron') as {
  contextBridge: {
    exposeInMainWorld: (apiKey: string, api: unknown) => void
  }
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }
}

type ActivityType = unknown
type ActivityTypeUpdateInput = unknown
type AppData = unknown
type AppSettings = unknown
type AppSettingsUpdateInput = unknown
type DayPlanItem = unknown
type DayPlanItemUpdateInput = unknown
type LocalSyncState = unknown
type RecurringTaskInstance = unknown
type RecurringTaskInstanceUpdateInput = unknown
type SceneTag = unknown
type SceneTagUpdateInput = unknown
type SyncChange = unknown
type SyncExportResult = unknown
type SyncImportResult = unknown
type SyncNowResult = unknown
type SyncTargetTestResult = unknown
type TaskTemplate = unknown
type TaskTemplateUpdateInput = unknown

contextBridge.exposeInMainWorld('jflowDesktop', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getDataPath: () => ipcRenderer.invoke('app:get-data-path'),
  getStorageInfo: () => ipcRenderer.invoke('app:get-storage-info') as Promise<{
    dataPath: string
    databasePath: string
    autoBackupDirectory: string
  }>,
  saveJsonBackup: (payload: { suggestedFilename: string; content: string }) =>
    ipcRenderer.invoke('app:save-json-backup', payload),
  readJsonBackup: () => ipcRenderer.invoke('app:read-json-backup'),
  readLatestAutoBackup: () => ipcRenderer.invoke('app:read-latest-auto-backup') as Promise<{
    filePath: string | null
    content: string | null
  }>,
  openDataDirectory: () => ipcRenderer.invoke('app:open-data-directory'),
  getAutoBackupInfo: () => ipcRenderer.invoke('app:get-auto-backup-info') as Promise<{
    directory: string
    backupCount: number
    latestBackupAt: string | null
  }>,
  createAutoBackup: () => ipcRenderer.invoke('app:create-auto-backup') as Promise<{
    created: boolean
    skipped: boolean
    filePath: string | null
    backupInfo: {
      directory: string
      backupCount: number
      latestBackupAt: string | null
    }
  }>,
  openBackupDirectory: () => ipcRenderer.invoke('app:open-backup-directory') as Promise<{
    success: boolean
    path: string
    errorMessage: string | null
  }>,
  repository: {
    appData: {
      get: () => ipcRenderer.invoke('db:app-data:get') as Promise<AppData | null>,
      replace: (appData: AppData) =>
        ipcRenderer.invoke('db:app-data:replace', appData) as Promise<AppData>,
      reset: (seed?: AppData) =>
        ipcRenderer.invoke('db:app-data:reset', seed) as Promise<AppData>,
      exportSnapshot: () => ipcRenderer.invoke('db:app-data:export') as Promise<AppData>,
      importSnapshot: (appData: AppData) =>
        ipcRenderer.invoke('db:app-data:import', appData) as Promise<AppData>,
    },
    settings: {
      get: () => ipcRenderer.invoke('db:settings:get') as Promise<AppSettings | null>,
      update: (payload: AppSettingsUpdateInput) =>
        ipcRenderer.invoke('db:settings:update', payload) as Promise<AppSettings>,
    },
    sync: {
      getState: () => ipcRenderer.invoke('db:sync:get-state') as Promise<LocalSyncState>,
      chooseTargetPath: () => ipcRenderer.invoke('db:sync:choose-target-path') as Promise<string | null>,
      openTargetPath: () =>
        ipcRenderer.invoke('db:sync:open-target-path') as Promise<{
          success: boolean
          path: string | null
          errorMessage: string | null
        }>,
      setTargetPath: (targetPath: string) =>
        ipcRenderer.invoke('db:sync:set-target-path', targetPath) as Promise<LocalSyncState>,
      clearTargetPath: () =>
        ipcRenderer.invoke('db:sync:clear-target-path') as Promise<LocalSyncState>,
      testTargetPath: (targetPath?: string) =>
        ipcRenderer.invoke('db:sync:test-target-path', targetPath) as Promise<SyncTargetTestResult>,
      exportLocalChanges: () =>
        ipcRenderer.invoke('db:sync:export-local-changes') as Promise<SyncExportResult>,
      importRemoteChanges: () =>
        ipcRenderer.invoke('db:sync:import-remote-changes') as Promise<SyncImportResult>,
      syncNow: () => ipcRenderer.invoke('db:sync:sync-now') as Promise<SyncNowResult>,
      listChanges: () => ipcRenderer.invoke('db:sync:list-changes') as Promise<SyncChange[]>,
    },
    sceneTags: {
      list: () => ipcRenderer.invoke('db:scene-tags:list') as Promise<SceneTag[]>,
      getById: (id: string) =>
        ipcRenderer.invoke('db:scene-tags:get-by-id', id) as Promise<SceneTag | null>,
      create: (payload: SceneTag) =>
        ipcRenderer.invoke('db:scene-tags:create', payload) as Promise<SceneTag>,
      update: (payload: SceneTagUpdateInput) =>
        ipcRenderer.invoke('db:scene-tags:update', payload) as Promise<SceneTag | null>,
      delete: (id: string) =>
        ipcRenderer.invoke('db:scene-tags:delete', id) as Promise<boolean>,
      deleteAndDetachTemplates: (id: string) =>
        ipcRenderer.invoke('db:scene-tags:delete-and-detach-templates', id) as Promise<boolean>,
    },
    activityTypes: {
      list: () => ipcRenderer.invoke('db:activity-types:list') as Promise<ActivityType[]>,
      getById: (id: string) =>
        ipcRenderer.invoke('db:activity-types:get-by-id', id) as Promise<ActivityType | null>,
      create: (payload: ActivityType) =>
        ipcRenderer.invoke('db:activity-types:create', payload) as Promise<ActivityType>,
      update: (payload: ActivityTypeUpdateInput) =>
        ipcRenderer.invoke('db:activity-types:update', payload) as Promise<ActivityType | null>,
      delete: (id: string) =>
        ipcRenderer.invoke('db:activity-types:delete', id) as Promise<boolean>,
      deleteIfUnused: (id: string) =>
        ipcRenderer.invoke('db:activity-types:delete-if-unused', id) as Promise<{
          removed: boolean
          reason: 'in_use' | 'not_found' | null
        }>,
    },
    taskTemplates: {
      list: () => ipcRenderer.invoke('db:task-templates:list') as Promise<TaskTemplate[]>,
      getById: (id: string) =>
        ipcRenderer.invoke('db:task-templates:get-by-id', id) as Promise<TaskTemplate | null>,
      create: (payload: TaskTemplate) =>
        ipcRenderer.invoke('db:task-templates:create', payload) as Promise<TaskTemplate>,
      update: (payload: TaskTemplateUpdateInput) =>
        ipcRenderer.invoke('db:task-templates:update', payload) as Promise<TaskTemplate | null>,
      delete: (id: string) =>
        ipcRenderer.invoke('db:task-templates:delete', id) as Promise<boolean>,
    },
    recurringTaskInstances: {
      list: () =>
        ipcRenderer.invoke('db:recurring-task-instances:list') as Promise<RecurringTaskInstance[]>,
      getById: (id: string) =>
        ipcRenderer.invoke('db:recurring-task-instances:get-by-id', id) as Promise<
          RecurringTaskInstance | null
        >,
      create: (payload: RecurringTaskInstance) =>
        ipcRenderer.invoke('db:recurring-task-instances:create', payload) as Promise<RecurringTaskInstance>,
      update: (payload: RecurringTaskInstanceUpdateInput) =>
        ipcRenderer.invoke('db:recurring-task-instances:update', payload) as Promise<
          RecurringTaskInstance | null
        >,
      delete: (id: string) =>
        ipcRenderer.invoke('db:recurring-task-instances:delete', id) as Promise<boolean>,
    },
    dayPlanItems: {
      list: () => ipcRenderer.invoke('db:day-plan-items:list') as Promise<DayPlanItem[]>,
      getById: (id: string) =>
        ipcRenderer.invoke('db:day-plan-items:get-by-id', id) as Promise<DayPlanItem | null>,
      create: (payload: DayPlanItem) =>
        ipcRenderer.invoke('db:day-plan-items:create', payload) as Promise<DayPlanItem>,
      update: (payload: DayPlanItemUpdateInput) =>
        ipcRenderer.invoke('db:day-plan-items:update', payload) as Promise<DayPlanItem | null>,
      delete: (id: string) =>
        ipcRenderer.invoke('db:day-plan-items:delete', id) as Promise<boolean>,
    },
  },
  getAppDataSnapshot: () => ipcRenderer.invoke('db:get-app-data-snapshot'),
  replaceAppDataSnapshot: (payload: {
    appData: AppData
    expectedRevision?: number
  }) => ipcRenderer.invoke('db:replace-app-data-snapshot', payload),
})

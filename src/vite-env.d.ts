/// <reference types="vite/client" />

import type { AppData } from '@/types'
import type {
  ActivityType,
  AppSettings,
  DayPlanItem,
  LocalSyncState,
  RecurringTaskInstance,
  SceneTag,
  SyncChange,
  SyncExportResult,
  SyncImportResult,
  SyncNowResult,
  SyncTargetTestResult,
  TaskTemplate,
} from '@/types'

type DesktopAppInfo = {
  name: string
  version: string
  platform: NodeJS.Platform
}

type DesktopAutoBackupInfo = {
  directory: string
  backupCount: number
  latestBackupAt: string | null
}

type DesktopStorageInfo = {
  dataPath: string
  databasePath: string
  autoBackupDirectory: string
}

type JFlowDesktopApi = {
  getAppInfo: () => Promise<DesktopAppInfo>
  getDataPath: () => Promise<string>
  getStorageInfo: () => Promise<DesktopStorageInfo>
  saveJsonBackup: (payload: {
    suggestedFilename: string
    content: string
  }) => Promise<{
    canceled: boolean
    filePath: string | null
  }>
  readJsonBackup: () => Promise<{
    canceled: boolean
    filePath: string | null
    content: string | null
  }>
  readLatestAutoBackup: () => Promise<{
    filePath: string | null
    content: string | null
  }>
  openDataDirectory: () => Promise<{
    success: boolean
    path: string
    errorMessage: string | null
  }>
  getAutoBackupInfo: () => Promise<DesktopAutoBackupInfo>
  createAutoBackup: () => Promise<{
    created: boolean
    skipped: boolean
    filePath: string | null
    backupInfo: DesktopAutoBackupInfo
  }>
  openBackupDirectory: () => Promise<{
    success: boolean
    path: string
    errorMessage: string | null
  }>
  getAppDataSnapshot: () => Promise<{
    appData: AppData | null
    revision: number
    databasePath: string
  }>
  replaceAppDataSnapshot: (payload: {
    appData: AppData
    expectedRevision?: number
  }) => Promise<
    | {
        ok: true
        appData: AppData
        revision: number
        databasePath: string
      }
    | {
        ok: false
        reason: 'conflict'
        revision: number
        databasePath: string
      }
  >
  repository: {
    appData: {
      get: () => Promise<AppData | null>
      replace: (appData: AppData) => Promise<AppData>
      reset: (seed?: AppData) => Promise<AppData>
      exportSnapshot: () => Promise<AppData>
      importSnapshot: (appData: AppData) => Promise<AppData>
    }
    settings: {
      get: () => Promise<AppSettings | null>
      update: (payload: Partial<Omit<AppSettings, 'createdAt' | 'updatedAt'>>) => Promise<AppSettings>
    }
    sync: {
      getState: () => Promise<LocalSyncState>
      chooseTargetPath: () => Promise<string | null>
      openTargetPath: () => Promise<{
        success: boolean
        path: string | null
        errorMessage: string | null
      }>
      setTargetPath: (targetPath: string) => Promise<LocalSyncState>
      clearTargetPath: () => Promise<LocalSyncState>
      testTargetPath: (targetPath?: string) => Promise<SyncTargetTestResult>
      exportLocalChanges: () => Promise<SyncExportResult>
      importRemoteChanges: () => Promise<SyncImportResult>
      syncNow: () => Promise<SyncNowResult>
      listChanges: () => Promise<SyncChange[]>
    }
    sceneTags: {
      list: () => Promise<SceneTag[]>
      getById: (id: string) => Promise<SceneTag | null>
      create: (payload: SceneTag) => Promise<SceneTag>
      update: (payload: Partial<Omit<SceneTag, 'id'>> & Pick<SceneTag, 'id'>) => Promise<SceneTag | null>
      delete: (id: string) => Promise<boolean>
      deleteAndDetachTemplates: (id: string) => Promise<boolean>
    }
    activityTypes: {
      list: () => Promise<ActivityType[]>
      getById: (id: string) => Promise<ActivityType | null>
      create: (payload: ActivityType) => Promise<ActivityType>
      update: (
        payload: Partial<Omit<ActivityType, 'id'>> & Pick<ActivityType, 'id'>,
      ) => Promise<ActivityType | null>
      delete: (id: string) => Promise<boolean>
      deleteIfUnused: (id: string) => Promise<{
        removed: boolean
        reason: 'in_use' | 'not_found' | null
      }>
    }
    taskTemplates: {
      list: () => Promise<TaskTemplate[]>
      getById: (id: string) => Promise<TaskTemplate | null>
      create: (payload: TaskTemplate) => Promise<TaskTemplate>
      update: (
        payload: Partial<Omit<TaskTemplate, 'id'>> & Pick<TaskTemplate, 'id'>,
      ) => Promise<TaskTemplate | null>
      delete: (id: string) => Promise<boolean>
    }
    recurringTaskInstances: {
      list: () => Promise<RecurringTaskInstance[]>
      getById: (id: string) => Promise<RecurringTaskInstance | null>
      create: (payload: RecurringTaskInstance) => Promise<RecurringTaskInstance>
      update: (
        payload: Partial<Omit<RecurringTaskInstance, 'id'>> & Pick<RecurringTaskInstance, 'id'>,
      ) => Promise<RecurringTaskInstance | null>
      delete: (id: string) => Promise<boolean>
    }
    dayPlanItems: {
      list: () => Promise<DayPlanItem[]>
      getById: (id: string) => Promise<DayPlanItem | null>
      create: (payload: DayPlanItem) => Promise<DayPlanItem>
      update: (
        payload: Partial<Omit<DayPlanItem, 'id'>> & Pick<DayPlanItem, 'id'>,
      ) => Promise<DayPlanItem | null>
      delete: (id: string) => Promise<boolean>
    }
  }
}

declare global {
  interface Window {
    jflowDesktop?: JFlowDesktopApi
  }
}

export {}

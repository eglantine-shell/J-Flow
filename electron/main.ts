import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createAutoBackup,
  getAutoBackupInfo,
  maybeCreateStartupAutoBackup,
} from './backup.js'
import {
  createSqliteActivityType,
  createSqliteDayPlanItem,
  createSqliteRecurringTaskInstance,
  createSqliteSceneTag,
  createSqliteTaskTemplate,
  deleteSqliteActivityTypeIfUnused,
  deleteSqliteSceneTagAndDetachTemplates,
  deleteSqliteActivityType,
  deleteSqliteDayPlanItem,
  deleteSqliteRecurringTaskInstance,
  deleteSqliteSceneTag,
  deleteSqliteTaskTemplate,
  getSqliteActivityTypeById,
  getSqliteAppData,
  getSqliteDatabasePath,
  getSqliteDayPlanItemById,
  getSqliteLocalSyncState,
  getSqliteRecurringTaskInstanceById,
  getSqliteSceneTagById,
  getSqliteSettings,
  getSqliteSnapshot,
  getSqliteTaskTemplateById,
  listSqliteSyncChanges,
  listSqliteActivityTypes,
  listSqliteDayPlanItems,
  listSqliteRecurringTaskInstances,
  listSqliteSceneTags,
  listSqliteTaskTemplates,
  replaceSqliteSnapshot,
  updateSqliteActivityType,
  updateSqliteDayPlanItem,
  updateSqliteRecurringTaskInstance,
  updateSqliteSceneTag,
  updateSqliteSettings,
  updateSqliteTaskTemplate,
} from './sqlite.js'
import type {
  ActivityType,
  ActivityTypeUpdateInput,
  AppData,
  AppSettingsUpdateInput,
  DayPlanItem,
  DayPlanItemUpdateInput,
  RecurringTaskInstance,
  RecurringTaskInstanceUpdateInput,
  SceneTag,
  SceneTagUpdateInput,
  TaskTemplate,
  TaskTemplateUpdateInput,
} from './types.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const preloadPath = path.join(currentDir, 'preload.cjs')
const rendererDistPath = path.join(currentDir, '../dist-desktop/renderer/index.html')
const devServerUrl = process.env.VITE_DEV_SERVER_URL

const ensureDataDirectory = async () => {
  const dataPath = app.getPath('userData')

  await mkdir(dataPath, { recursive: true })

  return dataPath
}

const createMainWindow = async () => {
  const window = new BrowserWindow({
    width: 980,
    height: 730,
    minWidth: 980,
    minHeight: 730,
    autoHideMenuBar: true,
    title: 'J-Flow',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (devServerUrl) {
    try {
      await window.loadURL(devServerUrl)
    } catch (error: unknown) {
      console.error('[J-Flow Desktop] Failed to load dev server URL', {
        url: devServerUrl,
        error,
      })
      throw error
    }

    window.webContents.openDevTools({ mode: 'detach' })
    return window
  }

  await window.loadFile(rendererDistPath)
  return window
}

const registerAppIpc = () => {
  ipcMain.handle('app:get-info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  }))

  ipcMain.handle('app:get-data-path', async () => ensureDataDirectory())

  ipcMain.handle('app:get-storage-info', async () => {
    const dataPath = await ensureDataDirectory()
    const backupInfo = await getAutoBackupInfo(dataPath)

    return {
      dataPath,
      databasePath: getSqliteDatabasePath(dataPath),
      autoBackupDirectory: backupInfo.directory,
    }
  })

  ipcMain.handle(
    'app:save-json-backup',
    async (
      _event,
      payload: {
        suggestedFilename: string
        content: string
      },
    ) => {
      const dataPath = await ensureDataDirectory()
      const result = await dialog.showSaveDialog({
        title: '导出 J-Flow 备份',
        defaultPath: path.join(dataPath, payload.suggestedFilename),
        filters: [
          {
            name: 'JSON Backup',
            extensions: ['json'],
          },
        ],
      })

      if (result.canceled || !result.filePath) {
        return {
          canceled: true,
          filePath: null,
        }
      }

      await writeFile(result.filePath, payload.content, 'utf8')

      return {
        canceled: false,
        filePath: result.filePath,
      }
    },
  )

  ipcMain.handle('app:read-json-backup', async () => {
    const dataPath = await ensureDataDirectory()
    const result = await dialog.showOpenDialog({
      title: '导入 J-Flow 备份',
      defaultPath: dataPath,
      properties: ['openFile'],
      filters: [
        {
          name: 'JSON Backup',
          extensions: ['json'],
        },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return {
        canceled: true,
        filePath: null,
        content: null,
      }
    }

    const filePath = result.filePaths[0]
    const content = await readFile(filePath, 'utf8')

    return {
      canceled: false,
      filePath,
      content,
    }
  })

  ipcMain.handle('app:open-data-directory', async () => {
    const dataPath = await ensureDataDirectory()
    const errorMessage = await shell.openPath(dataPath)

    return {
      success: errorMessage.length === 0,
      path: dataPath,
      errorMessage: errorMessage || null,
    }
  })

  ipcMain.handle('app:get-auto-backup-info', async () => {
    const dataPath = await ensureDataDirectory()

    return getAutoBackupInfo(dataPath)
  })

  ipcMain.handle('app:create-auto-backup', async () => {
    const dataPath = await ensureDataDirectory()

    return createAutoBackup(dataPath)
  })

  ipcMain.handle('app:open-backup-directory', async () => {
    const dataPath = await ensureDataDirectory()
    const backupInfo = await getAutoBackupInfo(dataPath)
    const errorMessage = await shell.openPath(backupInfo.directory)

    return {
      success: errorMessage.length === 0,
      path: backupInfo.directory,
      errorMessage: errorMessage || null,
    }
  })

  ipcMain.handle('db:get-app-data-snapshot', async () => {
    const dataPath = await ensureDataDirectory()

    return getSqliteSnapshot(dataPath)
  })

  ipcMain.handle('db:app-data:get', async () => {
    const dataPath = await ensureDataDirectory()

    return getSqliteAppData(dataPath)
  })

  ipcMain.handle('db:app-data:replace', async (_event, appData: AppData) => {
    const dataPath = await ensureDataDirectory()
    const result = replaceSqliteSnapshot(dataPath, appData)

    if (!result.ok) {
      throw new Error('Desktop app data replace conflict')
    }

    await createAutoBackup(dataPath)

    return result.appData
  })

  ipcMain.handle('db:app-data:reset', async (_event, seed?: AppData) => {
    const dataPath = await ensureDataDirectory()
    const nextSeed = seed ?? getSqliteAppData(dataPath)

    if (!nextSeed) {
      throw new Error('Reset seed unavailable')
    }

    const result = replaceSqliteSnapshot(dataPath, nextSeed)

    if (!result.ok) {
      throw new Error('Desktop app data reset conflict')
    }

    await createAutoBackup(dataPath)

    return result.appData
  })

  ipcMain.handle('db:app-data:export', async () => {
    const dataPath = await ensureDataDirectory()
    const appData = getSqliteAppData(dataPath)

    if (!appData) {
      throw new Error('App data not initialized')
    }

    return appData
  })

  ipcMain.handle('db:app-data:import', async (_event, appData: AppData) => {
    const dataPath = await ensureDataDirectory()
    const result = replaceSqliteSnapshot(dataPath, appData)

    if (!result.ok) {
      throw new Error('Desktop app data import conflict')
    }

    await createAutoBackup(dataPath)

    return result.appData
  })

  ipcMain.handle(
    'db:replace-app-data-snapshot',
    async (
      _event,
      payload: {
        appData: AppData
        expectedRevision?: number
      },
    ) => {
      const dataPath = await ensureDataDirectory()

      return replaceSqliteSnapshot(dataPath, payload.appData, payload.expectedRevision)
    },
  )

  ipcMain.handle('db:settings:get', async () => {
    const dataPath = await ensureDataDirectory()

    return getSqliteSettings(dataPath)
  })

  ipcMain.handle('db:sync:get-state', async () => {
    const dataPath = await ensureDataDirectory()

    return getSqliteLocalSyncState(dataPath)
  })

  ipcMain.handle('db:sync:list-changes', async () => {
    const dataPath = await ensureDataDirectory()

    return listSqliteSyncChanges(dataPath)
  })

  ipcMain.handle('db:settings:update', async (_event, payload: AppSettingsUpdateInput) => {
    const dataPath = await ensureDataDirectory()

    return updateSqliteSettings(dataPath, payload)
  })

  ipcMain.handle('db:scene-tags:list', async () => {
    const dataPath = await ensureDataDirectory()

    return listSqliteSceneTags(dataPath)
  })

  ipcMain.handle('db:scene-tags:get-by-id', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return getSqliteSceneTagById(dataPath, id)
  })

  ipcMain.handle('db:scene-tags:create', async (_event, payload: SceneTag) => {
    const dataPath = await ensureDataDirectory()

    return createSqliteSceneTag(dataPath, payload)
  })

  ipcMain.handle('db:scene-tags:update', async (_event, payload: SceneTagUpdateInput) => {
    const dataPath = await ensureDataDirectory()

    return updateSqliteSceneTag(dataPath, payload)
  })

  ipcMain.handle('db:scene-tags:delete', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return deleteSqliteSceneTag(dataPath, id)
  })

  ipcMain.handle('db:scene-tags:delete-and-detach-templates', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return deleteSqliteSceneTagAndDetachTemplates(dataPath, id)
  })

  ipcMain.handle('db:activity-types:list', async () => {
    const dataPath = await ensureDataDirectory()

    return listSqliteActivityTypes(dataPath)
  })

  ipcMain.handle('db:activity-types:get-by-id', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return getSqliteActivityTypeById(dataPath, id)
  })

  ipcMain.handle('db:activity-types:create', async (_event, payload: ActivityType) => {
    const dataPath = await ensureDataDirectory()

    return createSqliteActivityType(dataPath, payload)
  })

  ipcMain.handle(
    'db:activity-types:update',
    async (_event, payload: ActivityTypeUpdateInput) => {
      const dataPath = await ensureDataDirectory()

      return updateSqliteActivityType(dataPath, payload)
    },
  )

  ipcMain.handle('db:activity-types:delete', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return deleteSqliteActivityType(dataPath, id)
  })

  ipcMain.handle('db:activity-types:delete-if-unused', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return deleteSqliteActivityTypeIfUnused(dataPath, id)
  })

  ipcMain.handle('db:task-templates:list', async () => {
    const dataPath = await ensureDataDirectory()

    return listSqliteTaskTemplates(dataPath)
  })

  ipcMain.handle('db:task-templates:get-by-id', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return getSqliteTaskTemplateById(dataPath, id)
  })

  ipcMain.handle('db:task-templates:create', async (_event, payload: TaskTemplate) => {
    const dataPath = await ensureDataDirectory()

    return createSqliteTaskTemplate(dataPath, payload)
  })

  ipcMain.handle(
    'db:task-templates:update',
    async (_event, payload: TaskTemplateUpdateInput) => {
      const dataPath = await ensureDataDirectory()

      return updateSqliteTaskTemplate(dataPath, payload)
    },
  )

  ipcMain.handle('db:task-templates:delete', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return deleteSqliteTaskTemplate(dataPath, id)
  })

  ipcMain.handle('db:recurring-task-instances:list', async () => {
    const dataPath = await ensureDataDirectory()

    return listSqliteRecurringTaskInstances(dataPath)
  })

  ipcMain.handle('db:recurring-task-instances:get-by-id', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return getSqliteRecurringTaskInstanceById(dataPath, id)
  })

  ipcMain.handle(
    'db:recurring-task-instances:create',
    async (_event, payload: RecurringTaskInstance) => {
      const dataPath = await ensureDataDirectory()

      return createSqliteRecurringTaskInstance(dataPath, payload)
    },
  )

  ipcMain.handle(
    'db:recurring-task-instances:update',
    async (_event, payload: RecurringTaskInstanceUpdateInput) => {
      const dataPath = await ensureDataDirectory()

      return updateSqliteRecurringTaskInstance(dataPath, payload)
    },
  )

  ipcMain.handle('db:recurring-task-instances:delete', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return deleteSqliteRecurringTaskInstance(dataPath, id)
  })

  ipcMain.handle('db:day-plan-items:list', async () => {
    const dataPath = await ensureDataDirectory()

    return listSqliteDayPlanItems(dataPath)
  })

  ipcMain.handle('db:day-plan-items:get-by-id', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return getSqliteDayPlanItemById(dataPath, id)
  })

  ipcMain.handle('db:day-plan-items:create', async (_event, payload: DayPlanItem) => {
    const dataPath = await ensureDataDirectory()

    return createSqliteDayPlanItem(dataPath, payload)
  })

  ipcMain.handle('db:day-plan-items:update', async (_event, payload: DayPlanItemUpdateInput) => {
    const dataPath = await ensureDataDirectory()

    return updateSqliteDayPlanItem(dataPath, payload)
  })

  ipcMain.handle('db:day-plan-items:delete', async (_event, id: string) => {
    const dataPath = await ensureDataDirectory()

    return deleteSqliteDayPlanItem(dataPath, id)
  })
}

app.whenReady().then(async () => {
  registerAppIpc()
  const dataPath = await ensureDataDirectory()

  try {
    await maybeCreateStartupAutoBackup(dataPath)
  } catch (error: unknown) {
    console.error('[J-Flow Desktop] Startup auto backup failed', error)
  }

  await createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

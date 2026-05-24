export type SyncTargetType = 'localFolder' | 'oneDriveAppFolder'

export type SyncTargetConfig =
  | {
      type: 'localFolder'
      path: string
    }
  | {
      type: 'oneDriveAppFolder'
      accountId: string
      displayName?: string
    }

export type SyncTargetEntry = {
  logicalPath: string
  kind: 'file' | 'directory'
  updatedAt?: string
  size?: number
}

export interface SyncTargetDriver {
  type: SyncTargetType
  readText(logicalPath: string): Promise<string>
  writeText(logicalPath: string, content: string): Promise<void>
  delete(logicalPath: string): Promise<void>
  list(logicalPrefix: string): Promise<SyncTargetEntry[]>
  exists(logicalPath: string): Promise<boolean>
  ensureDir(logicalPath: string): Promise<void>
  safeWriteJson(logicalPath: string, data: unknown): Promise<void>
}

import Dexie, { type Table } from 'dexie'

import type { AppDataRecord } from '@/db/schema'

type MetaRecord = {
  key: string
  value: string
}

export class JFlowDatabase extends Dexie {
  meta!: Table<MetaRecord, string>
  appData!: Table<AppDataRecord, string>

  constructor() {
    super('j-flow')

    this.version(1).stores({
      meta: '&key',
    })

    this.version(2).stores({
      meta: '&key',
      appData: '&id',
    })
  }
}

export const db = new JFlowDatabase()

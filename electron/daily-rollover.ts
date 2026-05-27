import { ensurePreviousDayLogbook } from './daily-logbook.js'
import { toDateString } from './repeat-rule.js'
import {
  getSqliteLastDailyRolloverDate,
  setSqliteLastDailyRolloverDate,
} from './sqlite.js'
import { prepareSelectedDateState } from './selected-date-state.js'

export type DailyRolloverResult =
  | {
      triggered: true
      skippedReason: null
      todayKey: string
      logbookResult: {
        created: boolean
        date: string
      }
      selectedDateResult: {
        updated: boolean
        selectedDateKey: string
      }
    }
  | {
      triggered: false
      skippedReason: 'already_prepared'
      todayKey: string
    }

export const maybeRunDailyRollover = async (
  dataPath: string,
  referenceDate = new Date(),
): Promise<DailyRolloverResult> => {
  const todayKey = toDateString(referenceDate)
  const lastDailyRolloverDate = getSqliteLastDailyRolloverDate(dataPath)

  if (lastDailyRolloverDate === todayKey) {
    return {
      triggered: false,
      skippedReason: 'already_prepared',
      todayKey,
    }
  }

  const logbookResult = ensurePreviousDayLogbook(dataPath, referenceDate)
  const selectedDateResult = await prepareSelectedDateState(dataPath, todayKey, {
    includeCarryovers: true,
  })

  setSqliteLastDailyRolloverDate(dataPath, todayKey)

  return {
    triggered: true,
    skippedReason: null,
    todayKey,
    logbookResult,
    selectedDateResult,
  }
}

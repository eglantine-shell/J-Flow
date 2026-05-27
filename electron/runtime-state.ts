import { maybeRunDailyRollover } from './daily-rollover.js'

export const prepareCurrentDayState = async (
  dataPath: string,
  referenceDate = new Date(),
) => {
  const rolloverResult = await maybeRunDailyRollover(dataPath, referenceDate)

  return {
    logbookResult: rolloverResult.triggered ? rolloverResult.logbookResult : null,
    rolloverResult,
  }
}

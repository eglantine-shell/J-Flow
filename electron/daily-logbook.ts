import { getSqliteAppData, upsertSqliteLogbookEntry } from './sqlite.js'
import type { AppData, DayPlanItem, LogbookEntry, LogbookSnapshotItem } from './types.js'

const pad = (value: number) => String(value).padStart(2, '0')

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const getPreviousDay = (date: Date) => {
  const previous = new Date(date)
  previous.setDate(previous.getDate() - 1)
  return previous
}

const toTimeLabel = (isoString: string) => {
  const date = new Date(isoString)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const buildSegmentedProgressLogMap = (appData: AppData, dateKey: string) =>
  new Map(
    appData.segmentedProgressLogs
      .filter((log) => log.date === dateKey)
      .map((log) => [log.itemId, log] as const),
  )

const isOverdueAtDate = (deadlineDate: string | undefined, referenceDateKey: string) =>
  Boolean(deadlineDate && deadlineDate < referenceDateKey)

const resolveDeadlineStatus = (
  item: Pick<DayPlanItem, 'isNecessary' | 'deadlineDate'>,
  referenceDateKey: string,
): LogbookSnapshotItem['deadlineStatus'] => {
  if (!item.isNecessary || !item.deadlineDate) {
    return 'none'
  }

  return isOverdueAtDate(item.deadlineDate, referenceDateKey) ? 'overdue' : 'normal'
}

const buildCompletedSnapshotItems = (appData: AppData, dateKey: string): LogbookSnapshotItem[] =>
  appData.dayPlanItems
    .filter(
      (item) =>
        item.status === 'completed' &&
        item.completedAt &&
        item.completedAt.slice(0, 10) === dateKey,
    )
    .sort((left, right) => {
      const completedAtCompare = (left.completedAt ?? '').localeCompare(right.completedAt ?? '')

      if (completedAtCompare !== 0) {
        return completedAtCompare
      }

      return left.createdAt.localeCompare(right.createdAt)
    })
    .map((item) => ({
      id: item.id,
      status: 'completed' as const,
      titleSnapshot: item.title,
      time: toTimeLabel(item.completedAt as string),
      isNecessary: item.isNecessary,
      isPicked: item.source === 'decision_selected',
      isSegmented: item.isSegmented,
      deadlineDate: item.isNecessary ? item.deadlineDate : undefined,
      deadlineStatus: resolveDeadlineStatus(item, dateKey),
    }))

const buildPendingSnapshotItems = (appData: AppData, dateKey: string): LogbookSnapshotItem[] => {
  const segmentedProgressLogMap = buildSegmentedProgressLogMap(appData, dateKey)

  return appData.dayPlanItems
    .filter((item) => item.status === 'pending' && item.date === dateKey)
    .sort((left, right) => {
      const leftProgressLog = segmentedProgressLogMap.get(left.id)
      const rightProgressLog = segmentedProgressLogMap.get(right.id)
      const leftHasProgressAdvance = Boolean(
        leftProgressLog && leftProgressLog.toProgress > leftProgressLog.fromProgress,
      )
      const rightHasProgressAdvance = Boolean(
        rightProgressLog && rightProgressLog.toProgress > rightProgressLog.fromProgress,
      )
      const leftGroup = left.isSegmented ? (leftHasProgressAdvance ? 0 : 1) : 2
      const rightGroup = right.isSegmented ? (rightHasProgressAdvance ? 0 : 1) : 2

      if (leftGroup !== rightGroup) {
        return leftGroup - rightGroup
      }

      if (left.isNecessary !== right.isNecessary) {
        return left.isNecessary ? -1 : 1
      }

      if (left.isNecessary && right.isNecessary) {
        const leftIsOverdue = isOverdueAtDate(left.deadlineDate, dateKey)
        const rightIsOverdue = isOverdueAtDate(right.deadlineDate, dateKey)

        if (leftIsOverdue !== rightIsOverdue) {
          return leftIsOverdue ? -1 : 1
        }

        const leftDeadline = left.deadlineDate ?? '9999-12-31'
        const rightDeadline = right.deadlineDate ?? '9999-12-31'

        if (leftDeadline !== rightDeadline) {
          return leftDeadline.localeCompare(rightDeadline)
        }
      }

      return left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)
    })
    .map((item) => {
      const progressLog = segmentedProgressLogMap.get(item.id)
      const hasProgressAdvance = Boolean(progressLog && progressLog.toProgress > progressLog.fromProgress)

      return {
        id: item.id,
        status: 'pending' as const,
        titleSnapshot: item.title,
        isNecessary: item.isNecessary,
        isPicked: item.source === 'decision_selected',
        isSegmented: item.isSegmented,
        progressText: item.isSegmented
          ? hasProgressAdvance
            ? `已推进 ${Math.round(progressLog?.fromProgress ?? item.progressPercent)}%→${Math.round(progressLog?.toProgress ?? item.progressPercent)}%`
            : `当前进度 ${Math.round(item.progressPercent)}%`
          : undefined,
        deadlineDate: item.isNecessary ? item.deadlineDate : undefined,
        deadlineStatus: resolveDeadlineStatus(item, dateKey),
      } satisfies LogbookSnapshotItem
    })
}

const buildDeletedSnapshotItems = (appData: AppData, dateKey: string): LogbookSnapshotItem[] =>
  appData.dayPlanItems
    .filter(
      (item) =>
        item.status === 'deleted' &&
        item.deletedAt &&
        item.deletedAt.slice(0, 10) === dateKey,
    )
    .sort(
      (left, right) =>
        (left.deletedAt ?? '').localeCompare(right.deletedAt ?? '') ||
        left.createdAt.localeCompare(right.createdAt),
    )
    .map((item) => ({
      id: item.id,
      status: 'deleted' as const,
      titleSnapshot: item.title,
      isNecessary: item.isNecessary,
      isPicked: item.source === 'decision_selected',
      isSegmented: item.isSegmented,
      deadlineDate: item.isNecessary ? item.deadlineDate : undefined,
      deadlineStatus: resolveDeadlineStatus(item, dateKey),
    }))

export const buildLogbookEntryForDate = (appData: AppData, dateKey: string): LogbookEntry => ({
  date: dateKey,
  snapshotItems: [
    ...buildCompletedSnapshotItems(appData, dateKey),
    ...buildPendingSnapshotItems(appData, dateKey),
    ...buildDeletedSnapshotItems(appData, dateKey),
  ],
  remark: '',
  generatedAt: new Date().toISOString(),
})

export const ensurePreviousDayLogbook = (
  dataPath: string,
  referenceDate = new Date(),
) => {
  const targetDateKey = toDateKey(getPreviousDay(referenceDate))
  const appData = getSqliteAppData(dataPath)

  if (!appData) {
    return {
      created: false,
      date: targetDateKey,
    }
  }

  if (appData.logbookEntries.some((entry) => entry.date === targetDateKey)) {
    return {
      created: false,
      date: targetDateKey,
    }
  }

  const entry = buildLogbookEntryForDate(appData, targetDateKey)
  upsertSqliteLogbookEntry(dataPath, entry)

  return {
    created: true,
    date: targetDateKey,
    entry,
  }
}

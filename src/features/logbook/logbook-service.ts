import { appDataRepository } from '@/db/storage'
import { getTodoDisplayTitle } from '@/features/todo/todo-view-model'
import type {
  AppData,
  DayPlanItem,
  LogbookEntry,
  LogbookSnapshotItem,
} from '@/types'

const pad = (value: number) => String(value).padStart(2, '0')

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const toCompactDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-')

  return `${year.slice(-2)}${month}${day}`
}

const toCompactMonthDay = (dateKey: string) => {
  const [, month, day] = dateKey.split('-')

  return `${month ?? ''}${day ?? ''}`
}

const toTimeLabel = (isoString: string) => {
  const date = new Date(isoString)

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getPreviousDay = (date: Date) => {
  const previous = new Date(date)
  previous.setDate(previous.getDate() - 1)

  return previous
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
    .filter((item) => item.status === 'completed' && item.completedAt && item.completedAt.slice(0, 10) === dateKey)
    .sort((left, right) => {
      const completedAtCompare = (left.completedAt ?? '').localeCompare(right.completedAt ?? '')

      if (completedAtCompare !== 0) {
        return completedAtCompare
      }

      return left.createdAt.localeCompare(right.createdAt)
    })
    .map((item) => ({
      id: item.id,
      status: 'completed',
      titleSnapshot: getTodoDisplayTitle(item),
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
        status: 'pending',
        titleSnapshot: getTodoDisplayTitle(item),
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
    .filter((item) => item.status === 'deleted' && item.deletedAt && item.deletedAt.slice(0, 10) === dateKey)
    .sort(
      (left, right) =>
        (left.deletedAt ?? '').localeCompare(right.deletedAt ?? '') ||
        left.createdAt.localeCompare(right.createdAt),
    )
    .map((item) => ({
      id: item.id,
      status: 'deleted',
      titleSnapshot: getTodoDisplayTitle(item),
      isNecessary: item.isNecessary,
      isPicked: item.source === 'decision_selected',
      isSegmented: item.isSegmented,
      deadlineDate: item.isNecessary ? item.deadlineDate : undefined,
      deadlineStatus: resolveDeadlineStatus(item, dateKey),
    }))

const wrapTitleMarkdown = (item: LogbookSnapshotItem) => {
  const baseTitle = item.isNecessary ? `**${item.titleSnapshot}**` : item.titleSnapshot

  return item.status === 'deleted' ? `~~${baseTitle}~~` : baseTitle
}

const getLogbookTags = (item: LogbookSnapshotItem) => {
  const tags: string[] = []

  if (item.deadlineStatus === 'overdue') {
    tags.push('逾期')
  }

  if (item.isPicked) {
    tags.push('拔草')
  }

  if (item.isSegmented) {
    tags.push('分次')
  }

  return tags
}

const getLogbookDetails = (item: LogbookSnapshotItem) => {
  const details: string[] = []

  if (item.progressText) {
    details.push(item.progressText)
  }

  if (item.status === 'pending' && item.isNecessary && item.deadlineDate) {
    details.push(`DDL ${toCompactMonthDay(item.deadlineDate)}`)
  }

  return details
}

export const getLogbookSnapshotPresentation = (item: LogbookSnapshotItem) => ({
  checkbox: item.status === 'pending' ? '[ ]' : '[x]',
  time: item.status === 'completed' ? item.time ?? null : null,
  titleMarkdown: wrapTitleMarkdown(item),
  details: getLogbookDetails(item),
  tags: getLogbookTags(item),
  isNecessary: item.isNecessary,
  isDeleted: item.status === 'deleted',
  isOverdue: item.deadlineStatus === 'overdue',
})

export const buildLogbookSnapshotMarkdownLine = (item: LogbookSnapshotItem) => {
  const presentation = getLogbookSnapshotPresentation(item)
  const headlineSegments = [presentation.checkbox]

  if (presentation.time) {
    headlineSegments.push(presentation.time)
  }

  headlineSegments.push(presentation.titleMarkdown)

  const lineSegments = [headlineSegments.join(' '), ...presentation.details]
  const tagSuffix =
    presentation.tags.length > 0
      ? ` ${presentation.tags.map((tag) => `[${tag}]`).join(' ')}`
      : ''

  return `- ${lineSegments.join(' | ')}${tagSuffix}`
}

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

export const refreshExistingLogbookEntryForDate = (appData: AppData, dateKey: string): AppData => {
  const existingEntry = appData.logbookEntries.find((entry) => entry.date === dateKey)

  if (!existingEntry) {
    return appData
  }

  const refreshedEntry = buildLogbookEntryForDate(appData, dateKey)

  return {
    ...appData,
    logbookEntries: appData.logbookEntries.map((entry) =>
      entry.date === dateKey
        ? {
            ...refreshedEntry,
            remark: existingEntry.remark,
            generatedAt: existingEntry.generatedAt,
          }
        : entry,
    ),
  }
}

export async function ensureDailyLogbookUpToDate(referenceDate = new Date()) {
  const targetDateKey = toDateKey(getPreviousDay(referenceDate))

  return appDataRepository.update((current) => {
    if (current.logbookEntries.some((entry) => entry.date === targetDateKey)) {
      return current
    }

    const entry = buildLogbookEntryForDate(current, targetDateKey)

    return {
      ...current,
      logbookEntries: [entry, ...current.logbookEntries].sort((left, right) =>
        right.date.localeCompare(left.date),
      ),
    }
  })
}

export const buildLogbookMarkdown = (entry: LogbookEntry) => {
  const lines = [`## ${toCompactDateKey(entry.date)}`, '### 当日快照']

  if (entry.snapshotItems.length === 0) {
    lines.push('- 无')
  } else {
    lines.push(...entry.snapshotItems.map(buildLogbookSnapshotMarkdownLine))
  }

  lines.push('### 备注')

  if (entry.remark.trim().length > 0) {
    lines.push(entry.remark)
  }

  return `${lines.join('\n')}\n`
}

import { appDataRepository } from '@/db/storage'
import type {
  AppData,
  DayPlanItem,
  LogbookCompletedItem,
  LogbookDeletedItem,
  LogbookEntry,
  LogbookUnfinishedItem,
} from '@/types'

const pad = (value: number) => String(value).padStart(2, '0')

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const toCompactDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-')

  return `${year.slice(-2)}${month}${day}`
}

const toTimeLabel = (isoString: string) => {
  const date = new Date(isoString)

  return `${pad(date.getHours())}：${pad(date.getMinutes())}`
}

const getPreviousDay = (date: Date) => {
  const previous = new Date(date)
  previous.setDate(previous.getDate() - 1)

  return previous
}

const appendProgress = (item: Pick<DayPlanItem, 'isSegmented' | 'progressPercent' | 'title'>) =>
  item.isSegmented ? `${item.title} 进度：${Math.round(item.progressPercent)}%` : item.title

const buildSegmentedProgressLogMap = (appData: AppData, dateKey: string) =>
  new Map(
    appData.segmentedProgressLogs
      .filter((log) => log.date === dateKey)
      .map((log) => [log.itemId, log] as const),
  )

const buildCompletedItems = (appData: AppData, dateKey: string): LogbookCompletedItem[] =>
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
      titleSnapshot: item.title,
      time: toTimeLabel(item.completedAt as string),
      kind: item.source === 'decision_selected' ? 'picked' : 'completed',
      isNecessary: item.isNecessary,
    }))

const buildUnfinishedItems = (appData: AppData, dateKey: string): LogbookUnfinishedItem[] =>
  (() => {
    const segmentedProgressLogMap = buildSegmentedProgressLogMap(appData, dateKey)

    return appData.dayPlanItems
      .filter((item) => item.status === 'pending' && item.date === dateKey)
      .sort(
        (left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt),
      )
      .map((item) => {
        const progressLog = segmentedProgressLogMap.get(item.id)
        const titleSnapshot =
          progressLog && progressLog.toProgress > progressLog.fromProgress
            ? `推进 ${progressLog.titleSnapshot} ${Math.round(progressLog.fromProgress)}% -> ${Math.round(progressLog.toProgress)}%`
            : appendProgress(item)

        return {
          id: item.id,
          titleSnapshot,
          isNecessary: item.isNecessary,
          progressPercent: item.isSegmented ? Math.round(item.progressPercent) : undefined,
        }
      })
  })()

const buildDeletedItems = (appData: AppData, dateKey: string): LogbookDeletedItem[] =>
  appData.dayPlanItems
    .filter((item) => item.status === 'deleted' && item.deletedAt && item.deletedAt.slice(0, 10) === dateKey)
    .sort((left, right) => (left.deletedAt ?? '').localeCompare(right.deletedAt ?? '') || left.createdAt.localeCompare(right.createdAt))
    .map((item) => ({
      id: item.id,
      titleSnapshot: item.title,
      isNecessary: item.isNecessary,
    }))

export const buildLogbookEntryForDate = (appData: AppData, dateKey: string): LogbookEntry => ({
  date: dateKey,
  completedItems: buildCompletedItems(appData, dateKey),
  unfinishedItems: buildUnfinishedItems(appData, dateKey),
  deletedItems: buildDeletedItems(appData, dateKey),
  remark: '',
  generatedAt: new Date().toISOString(),
})

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

const emphasizeIfNecessary = (title: string, isNecessary: boolean) =>
  (isNecessary ? `**${title}**` : title)

export const buildLogbookMarkdown = (entry: LogbookEntry) => {
  const lines = [
    `## ${toCompactDateKey(entry.date)}`,
    '### 当日完成',
  ]

  if (entry.completedItems.length === 0) {
    lines.push('- 无')
  } else {
    lines.push(
      ...entry.completedItems.map(
        (item) =>
          `- ${item.time} *${item.kind === 'picked' ? '拔草' : '完成'}* ${emphasizeIfNecessary(item.titleSnapshot, item.isNecessary)}`,
      ),
    )
  }

  lines.push('### 当日未完成')

  if (entry.unfinishedItems.length === 0) {
    lines.push('- 无')
  } else {
    lines.push(...entry.unfinishedItems.map((item) => `- ${item.titleSnapshot}`))
  }

  lines.push('### 当日删除')

  if (entry.deletedItems.length === 0) {
    lines.push('- 无')
  } else {
    lines.push(...entry.deletedItems.map((item) => `- ~~${item.titleSnapshot}~~`))
  }

  lines.push('### 备注')

  if (entry.remark.trim().length > 0) {
    lines.push(entry.remark)
  }

  return `${lines.join('\n')}\n`
}

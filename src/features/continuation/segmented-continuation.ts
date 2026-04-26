import { appDataRepository } from '@/db'
import type { AppData, DayPlanItem, RecurringTaskInstance, RecurrenceRule } from '@/types'

const pad = (value: number) => String(value).padStart(2, '0')

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const parseDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(year, month - 1, day)
}

const toWeekDateKey = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayOfWeek = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayOfWeek)

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

  return `${utcDate.getUTCFullYear()}-W${pad(weekNumber)}`
}

const toDateKey = (date: Date, recurrence: Exclude<RecurrenceRule, 'none'>) => {
  switch (recurrence) {
    case 'daily':
      return toDateString(date)
    case 'weekly':
      return toWeekDateKey(date)
    case 'monthly':
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
    case 'yearly':
      return String(date.getFullYear())
  }
}

const getRootItemId = (item: DayPlanItem) => item.rootItemId ?? item.id

const isCarryableSegmentedItem = (item: DayPlanItem, selectedDateKey: string) =>
  item.isSegmented &&
  item.status !== 'completed' &&
  item.progressPercent > 0 &&
  item.progressPercent < 100 &&
  item.date < selectedDateKey

const compareItemsByDateDesc = (left: DayPlanItem, right: DayPlanItem) => {
  if (left.date !== right.date) {
    return right.date.localeCompare(left.date)
  }

  return right.createdAt.localeCompare(left.createdAt)
}

const getRecurringInstanceMap = (appData: AppData) =>
  appData.recurringTaskInstances.reduce<Record<string, RecurringTaskInstance>>((map, instance) => {
    map[instance.id] = instance
    return map
  }, {})

const isSameRecurringCycle = (
  item: DayPlanItem,
  selectedDate: Date,
  recurringInstancesById: Record<string, RecurringTaskInstance>,
) => {
  if (!item.recurringInstanceId) {
    return true
  }

  const recurringInstance = recurringInstancesById[item.recurringInstanceId]

  if (!recurringInstance) {
    return false
  }

  return toDateKey(selectedDate, recurringInstance.recurrence) === recurringInstance.dateKey
}

const hasRootItemOnDate = (
  items: DayPlanItem[],
  selectedDateKey: string,
  rootItemId: string,
) =>
  items.some((item) => item.date === selectedDateKey && getRootItemId(item) === rootItemId)

const findLatestCarryableItemsByRoot = (appData: AppData, selectedDateKey: string) => {
  const latestByRoot = new Map<string, DayPlanItem>()

  appData.dayPlanItems
    .filter((item) => isCarryableSegmentedItem(item, selectedDateKey))
    .sort(compareItemsByDateDesc)
    .forEach((item) => {
      const rootItemId = getRootItemId(item)

      if (!latestByRoot.has(rootItemId)) {
        latestByRoot.set(rootItemId, item)
      }
    })

  return latestByRoot
}

export function findLatestSegmentedTemplateCarryover({
  appData,
  templateId,
  beforeDate,
}: {
  appData: AppData
  templateId: string
  beforeDate: Date | string
}) {
  const selectedDate =
    typeof beforeDate === 'string' ? parseDate(beforeDate) : new Date(beforeDate)
  const selectedDateKey = toDateString(selectedDate)
  const recurringInstancesById = getRecurringInstanceMap(appData)

  const candidates = appData.dayPlanItems
    .filter(
      (item) =>
        item.templateId === templateId &&
        isCarryableSegmentedItem(item, selectedDateKey) &&
        (item.source !== 'auto_generated' ||
          !item.recurringInstanceId ||
          isSameRecurringCycle(item, selectedDate, recurringInstancesById)),
    )
    .sort(compareItemsByDateDesc)

  return candidates[0] ?? null
}

export async function syncSegmentedContinuationsForDate(selectedDateInput: Date | string) {
  const selectedDate =
    typeof selectedDateInput === 'string'
      ? parseDate(selectedDateInput)
      : new Date(selectedDateInput)
  const selectedDateKey = toDateString(selectedDate)
  const nowIso = new Date().toISOString()
  const appData = await appDataRepository.get()
  const recurringInstancesById = getRecurringInstanceMap(appData)
  const latestByRoot = findLatestCarryableItemsByRoot(appData, selectedDateKey)

  if (latestByRoot.size === 0) {
    return appData
  }

  const dayItems = appData.dayPlanItems.filter((item) => item.date === selectedDateKey)
  const nextSortOrder = {
    day:
      dayItems.filter((item) => item.timeBlock === 'day').reduce((max, item) => Math.max(max, item.sortOrder), 0) +
      1,
    night:
      dayItems.filter((item) => item.timeBlock === 'night').reduce((max, item) => Math.max(max, item.sortOrder), 0) +
      1,
  }

  const continuationItems = [...latestByRoot.values()]
    .filter((item) => !hasRootItemOnDate(appData.dayPlanItems, selectedDateKey, getRootItemId(item)))
    .filter(
      (item) =>
        item.source !== 'auto_generated' ||
        !item.recurringInstanceId ||
        isSameRecurringCycle(item, selectedDate, recurringInstancesById),
    )
    .sort((left, right) => {
      if (left.timeBlock !== right.timeBlock) {
        return left.timeBlock === 'day' ? -1 : 1
      }

      return compareItemsByDateDesc(left, right)
    })

  if (continuationItems.length === 0) {
    return appData
  }

  let nextAppData = appData

  continuationItems.forEach((item) => {
    const rootItemId = getRootItemId(item)
    const sortOrder = nextSortOrder[item.timeBlock]
    nextSortOrder[item.timeBlock] += 1

    const continuationItem: DayPlanItem = {
      id: `day-plan-item-continuation-${rootItemId}-${selectedDateKey}-${item.timeBlock}`,
      date: selectedDateKey,
      targetDate: item.targetDate,
      timeBlock: item.timeBlock,
      timeBlockSource: item.timeBlockSource,
      sortOrder,
      source: item.source,
      templateId: item.templateId,
      recurringInstanceId: item.recurringInstanceId,
      consumesDateTrigger: item.consumesDateTrigger,
      rootItemId,
      continuationOfItemId: item.id,
      carriedFromDate: item.date,
      title: item.title,
      activityTypeId: item.activityTypeId,
      isNecessary: item.isNecessary,
      requiresPreparation: item.requiresPreparation,
      preparationNotes: item.preparationNotes,
      isSegmented: true,
      progressState: 'in_progress',
      progressPercent: item.progressPercent,
      status: 'pending',
      createdAt: nowIso,
      completedAt: undefined,
    }

    nextAppData = {
      ...nextAppData,
      dayPlanItems: [...nextAppData.dayPlanItems, continuationItem],
    }
  })

  await appDataRepository.replace(nextAppData)

  return nextAppData
}

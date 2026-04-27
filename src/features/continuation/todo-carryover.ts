import { appDataRepository } from '@/db'
import type { AppData, DayPlanItem, RecurringTaskInstance, RecurrenceRule, TaskTemplate } from '@/types'

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

const resolveOriginDate = (item: Pick<DayPlanItem, 'originDate' | 'targetDate' | 'date'>) =>
  item.originDate ?? item.targetDate ?? item.date

const compareItemsByDateDesc = (left: DayPlanItem, right: DayPlanItem) => {
  if (left.date !== right.date) {
    return right.date.localeCompare(left.date)
  }

  return right.createdAt.localeCompare(left.createdAt)
}

const getLatestItemsByRootBeforeDate = (
  items: DayPlanItem[],
  selectedDateKey: string,
) => {
  const latestByRoot = new Map<string, DayPlanItem>()

  items
    .filter((item) => item.date < selectedDateKey)
    .sort(compareItemsByDateDesc)
    .forEach((item) => {
      const rootItemId = getRootItemId(item)

      if (!latestByRoot.has(rootItemId)) {
        latestByRoot.set(rootItemId, item)
      }
    })

  return latestByRoot
}

const getRecurringInstanceMap = (appData: AppData) =>
  appData.recurringTaskInstances.reduce<Record<string, RecurringTaskInstance>>((map, instance) => {
    map[instance.id] = instance
    return map
  }, {})

const getTemplateKindMap = (appData: AppData) =>
  appData.taskTemplates.reduce<Record<string, TaskTemplate['templateKind']>>((map, template) => {
    map[template.id] = template.templateKind
    return map
  }, {})

const isRepeatingItem = (
  item: DayPlanItem,
  templateKindsById: Record<string, TaskTemplate['templateKind']>,
) => Boolean(item.recurringInstanceId || (item.templateId && templateKindsById[item.templateId] === 'todo_recurring'))

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

const isCarryableTodoItem = (
  item: DayPlanItem,
  selectedDateKey: string,
  templateKindsById: Record<string, TaskTemplate['templateKind']>,
  recurringInstancesById: Record<string, RecurringTaskInstance>,
) => {
  if (item.status !== 'pending') {
    return false
  }

  if (item.date >= selectedDateKey) {
    return false
  }

  if (isRepeatingItem(item, templateKindsById)) {
    if (!item.templateId) {
      return false
    }

    if (!item.recurringInstanceId) {
      return true
    }

    const recurringInstance = recurringInstancesById[item.recurringInstanceId]

    return Boolean(
      !recurringInstance || recurringInstance.status === 'pending',
    )
  }

  if (item.isSegmented) {
    return item.progressPercent < 100
  }

  return true
}

const findLatestCarryableItemsByRoot = (
  appData: AppData,
  selectedDateKey: string,
  templateKindsById: Record<string, TaskTemplate['templateKind']>,
) => {
  const latestByRoot = new Map<string, DayPlanItem>()
  const latestItemsByRoot = getLatestItemsByRootBeforeDate(appData.dayPlanItems, selectedDateKey)
  const recurringInstancesById = getRecurringInstanceMap(appData)

  latestItemsByRoot.forEach((item, rootItemId) => {
    if (
      isCarryableTodoItem(
        item,
        selectedDateKey,
        templateKindsById,
        recurringInstancesById,
      )
    ) {
      latestByRoot.set(rootItemId, item)
    }
  })

  return latestByRoot
}

export function findLatestTodoCarryover({
  appData,
  beforeDate,
  predicate,
}: {
  appData: AppData
  beforeDate: Date | string
  predicate?: (item: DayPlanItem) => boolean
}) {
  const selectedDate =
    typeof beforeDate === 'string' ? parseDate(beforeDate) : new Date(beforeDate)
  const selectedDateKey = toDateString(selectedDate)
  const templateKindsById = getTemplateKindMap(appData)
  const candidates = [...findLatestCarryableItemsByRoot(appData, selectedDateKey, templateKindsById).values()]
    .filter((item) => (predicate ? predicate(item) : true))
    .sort(compareItemsByDateDesc)

  return candidates[0] ?? null
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
  const recurringInstancesById = getRecurringInstanceMap(appData)

  return (
    findLatestTodoCarryover({
      appData,
      beforeDate: selectedDate,
      predicate: (item) =>
        item.templateId === templateId &&
        item.isSegmented &&
        item.progressPercent < 100 &&
        (!item.recurringInstanceId || isSameRecurringCycle(item, selectedDate, recurringInstancesById)),
    }) ?? null
  )
}

export async function syncTodoCarryoversForDate(selectedDateInput: Date | string) {
  const selectedDate =
    typeof selectedDateInput === 'string'
      ? parseDate(selectedDateInput)
      : new Date(selectedDateInput)
  const selectedDateKey = toDateString(selectedDate)
  const appData = await appDataRepository.get()
  const templateKindsById = getTemplateKindMap(appData)
  const latestByRoot = findLatestCarryableItemsByRoot(appData, selectedDateKey, templateKindsById)

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

  const carryoverItems = [...latestByRoot.values()]
    .filter((item) => !hasRootItemOnDate(appData.dayPlanItems, selectedDateKey, getRootItemId(item)))
    .sort((left, right) => {
      if (left.timeBlock !== right.timeBlock) {
        return left.timeBlock === 'day' ? -1 : 1
      }

      return compareItemsByDateDesc(left, right)
    })

  if (carryoverItems.length === 0) {
    return appData
  }

  let nextAppData = appData

  carryoverItems.forEach((item) => {
    const sortOrder = nextSortOrder[item.timeBlock]
    nextSortOrder[item.timeBlock] += 1

    nextAppData = {
      ...nextAppData,
      dayPlanItems: nextAppData.dayPlanItems.map((dayPlanItem) =>
        dayPlanItem.id === item.id
          ? {
              ...dayPlanItem,
              date: selectedDateKey,
              originDate: resolveOriginDate(dayPlanItem),
              sortOrder,
            }
          : dayPlanItem,
      ),
    }
  })

  await appDataRepository.replace(nextAppData)

  return nextAppData
}

export async function syncSegmentedContinuationsForDate(selectedDateInput: Date | string) {
  return syncTodoCarryoversForDate(selectedDateInput)
}

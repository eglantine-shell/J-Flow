import type { DayPlanItem, TaskTemplate } from '@/types'

export type TemplateTodoSchedule =
  | {
      kind: 'unscheduled'
      item: null
      label: null
    }
  | {
      kind: 'today'
      item: DayPlanItem
      label: string
    }
  | {
      kind: 'other_day'
      item: DayPlanItem
      label: string
    }

const pad = (value: number) => String(value).padStart(2, '0')

export const toDateString = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const formatScheduledLabel = (dateString: string) => {
  const [, month, day] = dateString.split('-')

  return `已排在 ${Number(month)}/${Number(day)}`
}

const getPendingTemplateItems = (dayPlanItems: DayPlanItem[], templateId: string) =>
  dayPlanItems.filter(
    (item) =>
      item.templateId === templateId &&
      item.source === 'decision_selected' &&
      item.status === 'pending',
  )

const compareScheduledItems = (left: DayPlanItem, right: DayPlanItem, todayKey: string) => {
  const leftToday = left.date === todayKey
  const rightToday = right.date === todayKey

  if (leftToday !== rightToday) {
    return leftToday ? -1 : 1
  }

  const leftFuture = left.date > todayKey
  const rightFuture = right.date > todayKey

  if (leftFuture !== rightFuture) {
    return leftFuture ? -1 : 1
  }

  if (leftFuture && rightFuture) {
    return left.date.localeCompare(right.date)
  }

  if (!leftFuture && !rightFuture && !leftToday && !rightToday) {
    return right.date.localeCompare(left.date)
  }

  return left.sortOrder - right.sortOrder
}

export function resolveTemplateTodoSchedule(
  template: TaskTemplate,
  dayPlanItems: DayPlanItem[],
  todayKey: string,
): TemplateTodoSchedule {
  const pendingItems = getPendingTemplateItems(dayPlanItems, template.id).sort((left, right) =>
    compareScheduledItems(left, right, todayKey),
  )

  const scheduledItem = pendingItems[0]

  if (!scheduledItem) {
    return {
      kind: 'unscheduled',
      item: null,
      label: null,
    }
  }

  return {
    kind: scheduledItem.date === todayKey ? 'today' : 'other_day',
    item: scheduledItem,
    label: formatScheduledLabel(scheduledItem.date),
  }
}

export function shouldDisplayTemplateInManager(
  template: TaskTemplate,
  dayPlanItems: DayPlanItem[],
  todayKey: string,
) {
  if (template.templateKind !== 'grass' || template.isArchived) {
    return false
  }

  if (template.grassStatus === 'active') {
    return true
  }

  return resolveTemplateTodoSchedule(template, dayPlanItems, todayKey).kind !== 'unscheduled'
}

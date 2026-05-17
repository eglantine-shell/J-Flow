import type {
  RecurrenceRule,
  RepeatIntervalUnit,
  RepeatRule,
  RepeatType,
  RecurringTaskInstance,
  TaskTemplate,
} from '@/types'

type RepeatRuleSource = Pick<
  TaskTemplate | RecurringTaskInstance,
  'recurrence' | 'repeatType' | 'repeatIntervalUnit' | 'repeatIntervalValue'
>

const pad = (value: number) => String(value).padStart(2, '0')

const LEGACY_RECURRENCE_BY_INTERVAL_UNIT: Record<
  RepeatIntervalUnit,
  Exclude<RecurrenceRule, 'none'>
> = {
  day: 'daily',
  week: 'weekly',
  month: 'monthly',
  year: 'yearly',
}

const INTERVAL_UNIT_BY_LEGACY_RECURRENCE: Record<
  Exclude<RecurrenceRule, 'none'>,
  RepeatIntervalUnit
> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
}

export function clampRepeatIntervalValue(value: number) {
  return Math.min(100, Math.max(1, Math.trunc(value)))
}

export function parseRepeatIntervalValue(value: number | string | undefined | null) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isFinite(parsed)) {
    return null
  }

  return clampRepeatIntervalValue(parsed)
}

export function toLegacyRecurrence(
  intervalUnit: RepeatIntervalUnit,
): Exclude<RecurrenceRule, 'none'> {
  return LEGACY_RECURRENCE_BY_INTERVAL_UNIT[intervalUnit]
}

export function toRepeatIntervalUnit(
  recurrence: Exclude<RecurrenceRule, 'none'>,
): RepeatIntervalUnit {
  return INTERVAL_UNIT_BY_LEGACY_RECURRENCE[recurrence]
}

export function resolveRepeatRule(source: RepeatRuleSource): RepeatRule {
  if (source.repeatType === 'calendar' || source.repeatType === 'afterCompletion') {
    const intervalUnit =
      source.repeatIntervalUnit ?? toRepeatIntervalUnit(source.recurrence === 'none' ? 'daily' : source.recurrence)
    const intervalValue = parseRepeatIntervalValue(source.repeatIntervalValue) ?? 1

    return {
      repeatType: source.repeatType,
      intervalUnit,
      intervalValue,
    }
  }

  if (source.recurrence === 'none') {
    return {
      repeatType: 'none',
    }
  }

  return {
    repeatType: 'calendar',
    intervalUnit: toRepeatIntervalUnit(source.recurrence),
    intervalValue: 1,
  }
}

export function serializeRepeatRule(rule: RepeatRule) {
  if (rule.repeatType === 'none') {
    return {
      recurrence: 'none' as const,
      repeatType: 'none' as const,
      repeatIntervalUnit: undefined,
      repeatIntervalValue: undefined,
    }
  }

  const intervalUnit = rule.intervalUnit ?? 'day'
  const intervalValue = parseRepeatIntervalValue(rule.intervalValue) ?? 1

  return {
    recurrence: toLegacyRecurrence(intervalUnit),
    repeatType: rule.repeatType,
    repeatIntervalUnit: intervalUnit,
    repeatIntervalValue: intervalValue,
  }
}

export function toDateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function getLastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function addMonthsClamped(date: Date, months: number) {
  const year = date.getFullYear()
  const monthIndex = date.getMonth()
  const targetMonthIndex = monthIndex + months
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12
  const targetDay = Math.min(date.getDate(), getLastDayOfMonth(targetYear, normalizedMonthIndex))

  return new Date(
    targetYear,
    normalizedMonthIndex,
    targetDay,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  )
}

export function addYearsClamped(date: Date, years: number) {
  const targetYear = date.getFullYear() + years
  const targetDay = Math.min(date.getDate(), getLastDayOfMonth(targetYear, date.getMonth()))

  return new Date(
    targetYear,
    date.getMonth(),
    targetDay,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  )
}

export function addIntervalToDate(
  date: Date,
  intervalUnit: RepeatIntervalUnit,
  intervalValue: number,
) {
  const normalizedIntervalValue = clampRepeatIntervalValue(intervalValue)

  switch (intervalUnit) {
    case 'day': {
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + normalizedIntervalValue)
      return nextDate
    }
    case 'week': {
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + normalizedIntervalValue * 7)
      return nextDate
    }
    case 'month':
      return addMonthsClamped(date, normalizedIntervalValue)
    case 'year':
      return addYearsClamped(date, normalizedIntervalValue)
  }
}

export function matchesCalendarRepeatOnDate({
  anchorDate,
  selectedDate,
  intervalUnit,
  intervalValue,
}: {
  anchorDate: Date
  selectedDate: Date
  intervalUnit: RepeatIntervalUnit
  intervalValue: number
}) {
  if (selectedDate < anchorDate) {
    return false
  }

  const normalizedIntervalValue = clampRepeatIntervalValue(intervalValue)

  switch (intervalUnit) {
    case 'day': {
      const daysDiff = Math.floor(
        (new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime() -
          new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate()).getTime()) /
          86400000,
      )

      return daysDiff % normalizedIntervalValue === 0
    }
    case 'week': {
      const daysDiff = Math.floor(
        (new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime() -
          new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate()).getTime()) /
          86400000,
      )

      return daysDiff % (normalizedIntervalValue * 7) === 0
    }
    case 'month': {
      const monthsDiff =
        (selectedDate.getFullYear() - anchorDate.getFullYear()) * 12 +
        (selectedDate.getMonth() - anchorDate.getMonth())

      if (monthsDiff < 0 || monthsDiff % normalizedIntervalValue !== 0) {
        return false
      }

      return toDateString(addMonthsClamped(anchorDate, monthsDiff)) === toDateString(selectedDate)
    }
    case 'year': {
      const yearsDiff = selectedDate.getFullYear() - anchorDate.getFullYear()

      if (yearsDiff < 0 || yearsDiff % normalizedIntervalValue !== 0) {
        return false
      }

      return toDateString(addYearsClamped(anchorDate, yearsDiff)) === toDateString(selectedDate)
    }
  }
}

const toWeekDateKey = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayOfWeek = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayOfWeek)

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

  return `${utcDate.getUTCFullYear()}-W${pad(weekNumber)}`
}

export function toLegacyRecurringDateKey(
  date: Date,
  recurrence: Exclude<RecurrenceRule, 'none'>,
) {
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

export function buildRecurringInstanceSearchKeys(date: Date, rule: RepeatRule) {
  const keys = new Set<string>([toDateString(date)])

  if (rule.repeatType === 'calendar' && rule.intervalUnit && (rule.intervalValue ?? 1) === 1) {
    keys.add(toLegacyRecurringDateKey(date, toLegacyRecurrence(rule.intervalUnit)))
  }

  return [...keys]
}

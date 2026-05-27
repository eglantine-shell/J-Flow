const pad = (value: number) => String(value).padStart(2, '0')

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const parseDateKey = (dateKey?: string) => {
  if (!dateKey) {
    return null
  }

  const [year, month, day] = dateKey.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return toDateKey(date) === dateKey ? date : null
}

const diffCalendarDays = (startDateKey: string, endDateKey: string) => {
  const startDate = parseDateKey(startDateKey)
  const endDate = parseDateKey(endDateKey)

  if (!startDate || !endDate) {
    return null
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000

  return Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay)
}

export const getDeadlineDateFromWithinDays = (baseDateKey: string, withinDays: number) => {
  const baseDate = parseDateKey(baseDateKey)

  if (!baseDate || !Number.isInteger(withinDays) || withinDays < 1 || withinDays > 100) {
    return null
  }

  baseDate.setDate(baseDate.getDate() + withinDays - 1)

  return toDateKey(baseDate)
}

export const getDeadlineWithinDays = (baseDateKey: string, deadlineDate?: string) => {
  if (!deadlineDate) {
    return null
  }

  const diffDays = diffCalendarDays(baseDateKey, deadlineDate)

  if (diffDays === null || diffDays < 0) {
    return null
  }

  return diffDays + 1
}

export const resolveRecurringDeadlineDate = (input: {
  templateDate: string
  templateDeadlineDate?: string
  occurrenceDate: string
}) => {
  if (!input.templateDeadlineDate) {
    return undefined
  }

  const withinDays = getDeadlineWithinDays(input.templateDate, input.templateDeadlineDate)

  if (withinDays) {
    return (
      getDeadlineDateFromWithinDays(input.occurrenceDate, withinDays) ??
      input.templateDeadlineDate
    )
  }

  return input.templateDeadlineDate
}

import { describe, expect, it } from 'vitest'

import {
  formatDeadlineMonthDay,
  getDeadlineDateFromWithinDays,
  getDeadlinePresentation,
  getDeadlineWithinDays,
  resolveRecurringDeadlineDate,
} from '@/features/todo/deadline'

describe('todo deadline helpers', () => {
  it('converts within-days input into a real deadline date', () => {
    expect(getDeadlineDateFromWithinDays('2026-05-22', 1)).toBe('2026-05-22')
    expect(getDeadlineDateFromWithinDays('2026-05-22', 2)).toBe('2026-05-23')
    expect(getDeadlineDateFromWithinDays('2026-05-22', 5)).toBe('2026-05-26')
  })

  it('derives within-days from a real deadline date when the deadline is not before the item date', () => {
    expect(getDeadlineWithinDays('2026-05-22', '2026-05-22')).toBe(1)
    expect(getDeadlineWithinDays('2026-05-22', '2026-05-23')).toBe(2)
    expect(getDeadlineWithinDays('2026-05-22', '2026-09-01')).toBe(103)
    expect(getDeadlineWithinDays('2026-05-22', '2026-05-21')).toBeNull()
  })

  it('formats deadline presentation for future, due-today, and overdue states', () => {
    expect(getDeadlinePresentation('2026-05-23', '2026-05-22')).toEqual({
      label: 'DDL 5/23',
      isOverdue: false,
      isDueToday: false,
    })
    expect(getDeadlinePresentation('2026-05-22', '2026-05-22')).toEqual({
      label: '今日截止',
      isOverdue: false,
      isDueToday: true,
    })
    expect(getDeadlinePresentation('2026-05-21', '2026-05-22')).toEqual({
      label: 'DDL 5/21 已逾期',
      isOverdue: true,
      isDueToday: false,
    })
  })

  it('recomputes recurring occurrence deadlines from the template date offset', () => {
    expect(
      resolveRecurringDeadlineDate({
        templateDate: '2026-05-22',
        templateDeadlineDate: '2026-05-23',
        occurrenceDate: '2026-05-29',
      }),
    ).toBe('2026-05-30')
  })

  it('formats month/day labels without leading zeros', () => {
    expect(formatDeadlineMonthDay('2026-05-03')).toBe('5/3')
  })
})

import { describe, expect, it } from 'vitest'

import {
  getCompletedAtDraftDate,
  getCompletedAtDraftTime,
  toCompletedAtDraft,
  toCompletedAtIso,
  updateCompletedAtDraftDate,
  updateCompletedAtDraftTime,
} from '@/features/todo/completed-at-editor'

describe('completed-at editor', () => {
  it('formats an ISO value into local date and 24-hour time fields', () => {
    const draft = toCompletedAtDraft(new Date(2026, 5, 6, 23, 55).toISOString())

    expect(getCompletedAtDraftDate(draft)).toBe('2026-06-06')
    expect(getCompletedAtDraftTime(draft)).toBe('23:55')
  })

  it('updates date and time independently', () => {
    const draft = '2026-06-06T09:30'

    expect(updateCompletedAtDraftDate(draft, '2026-06-07')).toBe('2026-06-07T09:30')
    expect(updateCompletedAtDraftTime(draft, '16:40')).toBe('2026-06-06T16:40')
  })

  it('accepts valid 24-hour times and rejects 12-hour or invalid values', () => {
    expect(toCompletedAtIso('2026-06-06T00:05')).toBe(new Date(2026, 5, 6, 0, 5).toISOString())
    expect(toCompletedAtIso('2026-06-06T23:55')).toBe(new Date(2026, 5, 6, 23, 55).toISOString())
    expect(toCompletedAtIso('2026-06-06T11:55 PM')).toBeNull()
    expect(toCompletedAtIso('2026-06-06T24:00')).toBeNull()
  })
})

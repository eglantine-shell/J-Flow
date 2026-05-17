import { describe, expect, it } from 'vitest'

import {
  buildCompletedAtIsoForRecording,
  normalizeCompletedAtRoundingMinutes,
} from '@/features/todo/completed-at-rounding'

describe('completed-at rounding', () => {
  it('keeps the original timestamp when rounding is disabled', () => {
    const date = new Date('2026-05-03T08:36:00.000Z')

    expect(buildCompletedAtIsoForRecording(date, 0)).toBe('2026-05-03T08:36:00.000Z')
  })

  it('rounds to the nearest configured minute bucket', () => {
    const date = new Date('2026-05-03T08:36:00.000Z')

    expect(buildCompletedAtIsoForRecording(date, 5)).toBe('2026-05-03T08:35:00.000Z')
    expect(buildCompletedAtIsoForRecording(date, 10)).toBe('2026-05-03T08:40:00.000Z')
    expect(buildCompletedAtIsoForRecording(date, 30)).toBe('2026-05-03T08:30:00.000Z')
  })

  it('falls back to 5-minute rounding for invalid values', () => {
    expect(normalizeCompletedAtRoundingMinutes(7)).toBe(5)
  })
})

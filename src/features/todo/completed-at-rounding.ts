import type { AppSettings } from '@/types'

export const DEFAULT_COMPLETED_AT_ROUNDING_MINUTES: AppSettings['completedAtRoundingMinutes'] = 5

export const COMPLETED_AT_ROUNDING_OPTIONS: Array<{
  value: AppSettings['completedAtRoundingMinutes']
  label: string
}> = [
  { value: 0, label: '不取整' },
  { value: 5, label: '5 分钟取整' },
  { value: 10, label: '10 分钟取整' },
  { value: 30, label: '30 分钟取整' },
]

export const normalizeCompletedAtRoundingMinutes = (
  value: unknown,
): AppSettings['completedAtRoundingMinutes'] => {
  if (value === 0 || value === 5 || value === 10 || value === 30) {
    return value
  }

  return DEFAULT_COMPLETED_AT_ROUNDING_MINUTES
}

export const buildCompletedAtIsoForRecording = (
  date: Date,
  roundingMinutes: AppSettings['completedAtRoundingMinutes'],
) => {
  const normalizedMinutes = normalizeCompletedAtRoundingMinutes(roundingMinutes)

  if (normalizedMinutes === 0) {
    return date.toISOString()
  }

  const intervalMs = normalizedMinutes * 60 * 1000
  const roundedTimestamp = Math.round(date.getTime() / intervalMs) * intervalMs

  return new Date(roundedTimestamp).toISOString()
}

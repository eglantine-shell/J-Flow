const pad = (value: number) => String(value).padStart(2, '0')

export const toCompletedAtDraft = (iso?: string) => {
  if (!iso) {
    return ''
  }

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const getCompletedAtDraftDate = (draft: string) => draft.split('T')[0] ?? ''

export const getCompletedAtDraftTime = (draft: string) => draft.split('T')[1] ?? ''

export const updateCompletedAtDraftDate = (draft: string, dateValue: string) =>
  `${dateValue}T${getCompletedAtDraftTime(draft)}`

export const updateCompletedAtDraftTime = (draft: string, timeValue: string) =>
  `${getCompletedAtDraftDate(draft)}T${timeValue}`

export const toCompletedAtIso = (draft: string) => {
  const dateValue = getCompletedAtDraftDate(draft)
  const timeValue = getCompletedAtDraftTime(draft)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) {
    return null
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  const [hours, minutes] = timeValue.split(':').map(Number)
  const date = new Date(year, month - 1, day, hours, minutes)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date.toISOString()
}

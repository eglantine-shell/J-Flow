import { describe, expect, it } from 'vitest'

import {
  GRASS_BATCH_MAX_LINES,
  parseGrassBatchTitles,
  validateTaskTemplateForm,
} from '@/features/templates/TemplateFormFields'

describe('parseGrassBatchTitles', () => {
  it('splits multiline input into trimmed non-empty titles', () => {
    expect(parseGrassBatchTitles('  散步 \n\n 看展  \r\n  做饭 ')).toEqual([
      '散步',
      '看展',
      '做饭',
    ])
  })
})

describe('validateTaskTemplateForm', () => {
  it('rejects submissions that exceed the batch line limit', () => {
    const title = Array.from(
      { length: GRASS_BATCH_MAX_LINES + 1 },
      (_, index) => `第 ${index + 1} 条`,
    ).join('\n')

    expect(
      validateTaskTemplateForm({
        activityTypeId: 'activity-reading',
        title,
        sceneTagIds: [],
        interestLevel: 2,
      }),
    ).toBe(`一次最多保存 ${GRASS_BATCH_MAX_LINES} 条种草。`)
  })
})

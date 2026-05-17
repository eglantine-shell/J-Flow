const createdAt = '2026-04-17T09:00:00.000Z'
const updatedAt = '2026-04-17T09:30:00.000Z'

export const sqliteTestSeedAppData = {
  settings: {
    initialized: false,
    tieBreakerOrder: 'desc' as const,
    weatherEnabled: false,
    completedAtRoundingMinutes: 5 as const,
    createdAt,
    updatedAt,
  },
  sceneTags: [
    {
      id: 'scene-weekday-evening',
      name: '工作日晚上',
      createdAt,
      isBuiltIn: true,
    },
    {
      id: 'scene-weekend',
      name: '周末',
      createdAt,
      isBuiltIn: true,
    },
  ],
  activityTypes: [
    {
      id: 'activity-reading',
      name: '阅读',
      createdAt,
      isBuiltIn: true,
    },
    {
      id: 'activity-movie',
      name: '观影',
      createdAt,
      isBuiltIn: true,
    },
  ],
  taskTemplates: [],
  recurringTaskInstances: [],
  dayPlanItems: [],
  logbookEntries: [],
  segmentedProgressLogs: [],
}

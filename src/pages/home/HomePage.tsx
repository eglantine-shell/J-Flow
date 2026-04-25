import { useMemo, useState } from 'react'

import { CreateTaskTemplateForm, TemplateManagerPanel } from '@/features/templates'
import { TodoModePanel } from '@/features/todo'

const formatHeaderLabel = (date: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)

  return nextDate
}

export function HomePage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [showComposer, setShowComposer] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)

  const selectedHeaderLabel = useMemo(
    () => formatHeaderLabel(selectedDate),
    [selectedDate],
  )

  return (
    <div className="home-layout">
      <section className="home-appbar">
        <p className="eyebrow">Today</p>

        <div className="home-appbar__controls">
          <div className="date-nav" aria-label="日期切换">
            <button
              className="icon-button"
              type="button"
              aria-label="前一天"
              onClick={() => {
                setSelectedDate((current) => addDays(current, -1))
              }}
            >
              ‹
            </button>
            <h2>{selectedHeaderLabel}</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="后一天"
              onClick={() => {
                setSelectedDate((current) => addDays(current, 1))
              }}
            >
              ›
            </button>
            <span className="weather-chip weather-chip--icon" aria-label="天气占位">
              <span className="weather-chip__icon">o</span>
            </span>
          </div>
        </div>
      </section>

      <section className="home-main">
        <div className="home-section-intro">
          <div>
            <p className="eyebrow">Todo</p>
            <h3>今天的 Todo</h3>
          </div>
        </div>
        <TodoModePanel selectedDate={selectedDate} />
      </section>

      <section className="home-layout__composer">
        <div className="surface-card surface-card--compact">
          <div className="composer-entry composer-entry--toolbar">
            <span className="composer-entry__title">种草</span>
            <div className="composer-entry__actions">
              <button
                className="icon-button icon-button--toolbar"
                type="button"
                aria-label={showComposer ? '收起新增种草' : '展开新增种草'}
                onClick={() => {
                  setShowComposer((current) => !current)
                }}
              >
                {showComposer ? '−' : '+'}
              </button>

              <button
                className="icon-button icon-button--toolbar"
                type="button"
                aria-label={showTemplateManager ? '收起管理种草' : '展开管理种草'}
                onClick={() => {
                  setShowTemplateManager((current) => !current)
                }}
              >
                ≡
              </button>
            </div>
          </div>

          {showComposer ? (
            <div className="composer-panel">
              <CreateTaskTemplateForm />
            </div>
          ) : null}

          {showTemplateManager ? (
            <div className="composer-panel composer-panel--secondary">
              <TemplateManagerPanel />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

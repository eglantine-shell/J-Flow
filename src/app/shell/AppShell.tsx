import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import {
  CalendarIcon,
  ListIcon,
  LogbookIcon,
  SettingsIcon,
} from '@/components/ui/Icons'

type AppShellContextValue = {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
}

const pad = (value: number) => String(value).padStart(2, '0')

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const formatTodayLabel = (date: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
  }).format(date)

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const addMonths = (date: Date, months: number) => {
  const next = new Date(date)
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  return next
}

const getStartOfToday = () => {
  const now = new Date()

  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const buildMonthMatrix = (monthDate: Date) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startWeekday = (start.getDay() + 6) % 7
  const gridStart = addDays(start, -startWeekday)

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

function CalendarSidebar({
  selectedDate,
  today,
  onSelectDate,
}: {
  selectedDate: Date
  today: Date
  onSelectDate: (date: Date) => void
}) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )

  useEffect(() => {
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }, [selectedDate])

  const monthDays = useMemo(() => buildMonthMatrix(visibleMonth), [visibleMonth])

  const weeks = useMemo(() => {
    const result: Date[][] = []

    for (let index = 0; index < monthDays.length; index += 7) {
      result.push(monthDays.slice(index, index + 7))
    }

    return result
  }, [monthDays])

  return (
    <section className="sidebar-calendar">
      <div className="sidebar-calendar__toolbar">
        <button
          className="icon-button icon-button--toolbar"
          type="button"
          aria-label="上一月"
          onClick={() => {
            setVisibleMonth((current) => addMonths(current, -1))
          }}
        >
          ‹
        </button>
        <strong>{formatMonthLabel(visibleMonth)}</strong>
        <button
          className="icon-button icon-button--toolbar"
          type="button"
          aria-label="下一月"
          onClick={() => {
            setVisibleMonth((current) => addMonths(current, 1))
          }}
        >
          ›
        </button>
      </div>

      <div className="sidebar-calendar__weekdays" aria-hidden="true">
        {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="sidebar-calendar__grid" aria-label="月历">
        {weeks.map((week, weekIndex) => (
          <div className="sidebar-calendar__week" key={`${formatMonthLabel(visibleMonth)}-${weekIndex}`}>
            {week.map((day) => {
              const isSelected = sameDay(day, selectedDate)
              const isToday = sameDay(day, today)
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth()

              return (
                <button
                  key={`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`}
                  className={
                    isSelected
                      ? 'sidebar-calendar__day sidebar-calendar__day--selected'
                      : isToday
                        ? 'sidebar-calendar__day sidebar-calendar__day--today'
                        : isCurrentMonth
                          ? 'sidebar-calendar__day'
                          : 'sidebar-calendar__day sidebar-calendar__day--muted'
                  }
                  type="button"
                  onClick={() => {
                    onSelectDate(day)
                    setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1))
                  }}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

export function AppShell() {
  const location = useLocation()
  const showPrimaryNavigation = location.pathname !== '/setup'
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [today, setToday] = useState(getStartOfToday)

  useEffect(() => {
    const refreshToday = () => {
      const nextToday = getStartOfToday()

      setToday((currentToday) => {
        if (sameDay(currentToday, nextToday)) {
          return currentToday
        }

        setSelectedDate((currentSelectedDate) =>
          sameDay(currentSelectedDate, currentToday) ? nextToday : currentSelectedDate,
        )

        return nextToday
      })
    }

    const intervalId = window.setInterval(refreshToday, 60 * 1000)

    window.addEventListener('focus', refreshToday)
    document.addEventListener('visibilitychange', refreshToday)
    refreshToday()

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshToday)
      document.removeEventListener('visibilitychange', refreshToday)
    }
  }, [])

  const contextValue = useMemo<AppShellContextValue>(
    () => ({
      selectedDate,
      setSelectedDate,
    }),
    [selectedDate],
  )

  return (
    <div className="app-shell">
      <div className="app-shell__desktop-frame">
        <aside className="app-shell__sidebar">
          <div className="app-shell__sidebar-header">
            <p className="app-shell__brand">J-Flow</p>
            <p className="app-shell__brand-caption">J人用的拔草todo</p>
          </div>

          {showPrimaryNavigation ? (
            <>
              <section className="sidebar-today">
                <div className="sidebar-today__toolbar">
                  <button
                    className="icon-button icon-button--toolbar sidebar-today__nav-button"
                    type="button"
                    aria-label="前一天"
                    onClick={() => {
                      setSelectedDate((current) => addDays(current, -1))
                    }}
                  >
                    ‹
                  </button>

                  <div className="sidebar-today__label-group">
                    <span className="sidebar-today__eyebrow">This Day</span>
                    <strong>{formatTodayLabel(selectedDate)}</strong>
                  </div>

                  <button
                    className="icon-button icon-button--toolbar sidebar-today__nav-button"
                    type="button"
                    aria-label="后一天"
                    onClick={() => {
                      setSelectedDate((current) => addDays(current, 1))
                    }}
                  >
                    ›
                  </button>
                </div>
              </section>

              <CalendarSidebar
                selectedDate={selectedDate}
                today={today}
                onSelectDate={(date) => {
                  setSelectedDate(date)
                }}
              />

              <nav className="sidebar-nav" aria-label="主导航">
                <Link
                  className={location.pathname === '/' ? 'sidebar-nav__item sidebar-nav__item--active' : 'sidebar-nav__item'}
                  to="/"
                >
                  <CalendarIcon className="sidebar-nav__icon" />
                  <span>TODO</span>
                </Link>
                <Link
                  className={location.pathname === '/grass-list' ? 'sidebar-nav__item sidebar-nav__item--active' : 'sidebar-nav__item'}
                  to="/grass-list"
                >
                  <ListIcon className="sidebar-nav__icon" />
                  <span>种草清单</span>
                </Link>
                <Link
                  className={location.pathname === '/logbook' ? 'sidebar-nav__item sidebar-nav__item--active' : 'sidebar-nav__item'}
                  to="/logbook"
                >
                  <LogbookIcon className="sidebar-nav__icon" />
                  <span>日志</span>
                </Link>
                <Link
                  className={location.pathname === '/settings' ? 'sidebar-nav__item sidebar-nav__item--active' : 'sidebar-nav__item'}
                  to="/settings"
                >
                  <SettingsIcon className="sidebar-nav__icon" />
                  <span>设置</span>
                </Link>
              </nav>
            </>
          ) : null}
        </aside>

        <main className="app-shell__content">
          <div className="app-shell__workspace">
            <Outlet context={contextValue} />
          </div>
        </main>
      </div>
    </div>
  )
}

export type { AppShellContextValue }

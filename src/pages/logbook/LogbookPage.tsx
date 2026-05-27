import { useEffect, useMemo, useState } from 'react'

import { CopyIcon, SaveIcon } from '@/components/ui/Icons'
import { appDataRepository } from '@/db'
import {
  buildLogbookMarkdown,
  getLogbookSnapshotPresentation,
  ensureDailyLogbookUpToDate,
} from '@/features/logbook/logbook-service'
import type { LogbookEntry } from '@/types'

const isDesktopRuntime = () =>
  typeof window !== 'undefined' && Boolean(window.jflowDesktop)

type CopyState = Record<string, boolean>
type RemarkDraftState = Record<string, string>
type SavingState = Record<string, boolean>
type DeletingState = Record<string, boolean>

export function LogbookPage() {
  const [entries, setEntries] = useState<LogbookEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<CopyState>({})
  const [remarkDrafts, setRemarkDrafts] = useState<RemarkDraftState>({})
  const [savingState, setSavingState] = useState<SavingState>({})
  const [deletingState, setDeletingState] = useState<DeletingState>({})

  const sortedEntries = useMemo(
    () => [...entries].sort((left, right) => right.date.localeCompare(left.date)),
    [entries],
  )

  useEffect(() => {
    let cancelled = false

    const loadEntries = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        if (isDesktopRuntime()) {
          await appDataRepository.lifecycle.prepareCurrentDayState()
        } else {
          await ensureDailyLogbookUpToDate()
        }

        const appData = await appDataRepository.get()

        if (cancelled) {
          return
        }

        const nextEntries = [...appData.logbookEntries].sort((left, right) =>
          right.date.localeCompare(left.date),
        )

        setEntries(nextEntries)
        setRemarkDrafts(
          Object.fromEntries(nextEntries.map((entry) => [entry.date, entry.remark])),
        )
      } catch (error: unknown) {
        if (cancelled) {
          return
        }

        setErrorMessage(error instanceof Error ? error.message : '日志读取失败，请稍后重试。')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadEntries()

    return () => {
      cancelled = true
    }
  }, [])

  const saveRemark = async (date: string) => {
    const nextRemark = remarkDrafts[date] ?? ''
    setSavingState((current) => ({ ...current, [date]: true }))

    try {
      const updated = await appDataRepository.update((current) => ({
        ...current,
        logbookEntries: current.logbookEntries.map((entry) =>
          entry.date === date ? { ...entry, remark: nextRemark } : entry,
        ),
      }))

      setEntries(updated.logbookEntries)
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '备注保存失败，请稍后重试。')
    } finally {
      setSavingState((current) => ({ ...current, [date]: false }))
    }
  }

  const copyMarkdown = async (entry: LogbookEntry) => {
    await navigator.clipboard.writeText(buildLogbookMarkdown(entry))
    setCopyState((current) => ({ ...current, [entry.date]: true }))
    window.setTimeout(() => {
      setCopyState((current) => ({ ...current, [entry.date]: false }))
    }, 1600)
  }

  const deleteEntry = async (entry: LogbookEntry) => {
    const confirmed = window.confirm(`确认永久删除 ${entry.date.replaceAll('-', '.')} 的当日快照吗？`)

    if (!confirmed) {
      return
    }

    setDeletingState((current) => ({ ...current, [entry.date]: true }))

    try {
      const updated = await appDataRepository.update((current) => ({
        ...current,
        logbookEntries: current.logbookEntries.filter((item) => item.date !== entry.date),
      }))

      const nextEntries = [...updated.logbookEntries].sort((left, right) =>
        right.date.localeCompare(left.date),
      )

      setEntries(nextEntries)
      setRemarkDrafts((current) => {
        const next = { ...current }
        delete next[entry.date]
        return next
      })
      setCopyState((current) => {
        const next = { ...current }
        delete next[entry.date]
        return next
      })
      setSavingState((current) => {
        const next = { ...current }
        delete next[entry.date]
        return next
      })
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '日志删除失败，请稍后重试。')
    } finally {
      setDeletingState((current) => {
        const next = { ...current }
        delete next[entry.date]
        return next
      })
    }
  }

  return (
    <div className="page-stack">
      <section className="surface-card surface-card--compact page-panel page-panel--logbook">
        <div className="page-stack__header">
          <p className="eyebrow">Logbook</p>
          <h2>日志</h2>
        </div>

        <div className="page-panel__body page-panel__body--logbook">
          {errorMessage ? (
            <div className="empty-state-card empty-state-card--danger">
              <p>{errorMessage}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="empty-state-card empty-state-card--manager">
              <p>日志加载中…</p>
            </div>
          ) : null}

          {!isLoading && sortedEntries.length === 0 ? (
            <div className="empty-state-card empty-state-card--manager">
              <p>还没有可展示的日志。等跨过一天后，系统会自动补生成前一天的归档。</p>
            </div>
          ) : null}

          {sortedEntries.map((entry) => (
            <article className="logbook-entry" key={entry.date}>
              <header className="logbook-entry__header">
                <div className="logbook-entry__title-group">
                  <p className="eyebrow">当日快照</p>
                  <h3>{entry.date.replaceAll('-', '.')}</h3>
                </div>

                <div className="logbook-entry__actions">
                  <button
                    className="ghost-button ghost-button--compact logbook-entry__copy-button"
                    type="button"
                    onClick={() => {
                      void copyMarkdown(entry)
                    }}
                  >
                    <CopyIcon className="ghost-button__icon" />
                    <span>{copyState[entry.date] ? '已复制' : '复制 Markdown'}</span>
                  </button>

                  <button
                    className="ghost-button ghost-button--compact ghost-button--danger logbook-entry__delete-button"
                    type="button"
                    aria-label={deletingState[entry.date] ? '删除当日快照中' : '删除当日快照'}
                    disabled={deletingState[entry.date]}
                    onClick={() => {
                      void deleteEntry(entry)
                    }}
                  >
                    <span>{deletingState[entry.date] ? '删除中' : '删除'}</span>
                  </button>
                </div>
              </header>

              <section className="logbook-section">
                <h4>当日快照</h4>
                {entry.snapshotItems.length === 0 ? (
                  <p className="logbook-section__empty">无</p>
                ) : (
                  <ul className="logbook-list logbook-list--plain">
                    {entry.snapshotItems.map((item) => {
                      const presentation = getLogbookSnapshotPresentation(item)

                      return (
                        <li
                          className={
                            presentation.isDeleted
                              ? 'logbook-snapshot logbook-snapshot--deleted'
                              : item.status === 'completed'
                                ? 'logbook-snapshot logbook-snapshot--completed'
                              : 'logbook-snapshot'
                          }
                          key={item.id}
                        >
                          <span
                            aria-hidden="true"
                            className={
                              item.status === 'pending'
                                ? 'logbook-snapshot__checkbox logbook-snapshot__checkbox--pending'
                                : 'logbook-snapshot__checkbox logbook-snapshot__checkbox--checked'
                            }
                          />
                          {presentation.time ? (
                            <span className="logbook-snapshot__time">{presentation.time}</span>
                          ) : null}
                          <span
                            className={
                              presentation.isNecessary
                                ? 'logbook-snapshot__title logbook-snapshot__title--necessary'
                                : 'logbook-snapshot__title'
                            }
                          >
                            {item.titleSnapshot}
                          </span>
                          {presentation.details.map((detail) => (
                            <span className="logbook-snapshot__detail" key={`${item.id}-${detail}`}>
                              {detail}
                            </span>
                          ))}
                          {presentation.tags.map((tag) => (
                            <span
                              className="logbook-inline-tag"
                              key={`${item.id}-${tag}`}
                            >
                              [{tag}]
                            </span>
                          ))}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className="logbook-section">
                <div className="logbook-section__header">
                  <h4>备注</h4>
                  <button
                    className="icon-button icon-button--toolbar"
                    type="button"
                    aria-label={savingState[entry.date] ? '保存备注中' : '保存备注'}
                    disabled={savingState[entry.date]}
                    onClick={() => {
                      void saveRemark(entry.date)
                    }}
                  >
                    <SaveIcon className="icon-button__icon" />
                  </button>
                </div>

                <textarea
                  className="logbook-entry__remark"
                  rows={4}
                  value={remarkDrafts[entry.date] ?? ''}
                  placeholder="记录一下这一天的补充备注。"
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setRemarkDrafts((current) => ({
                      ...current,
                      [entry.date]: nextValue,
                    }))
                  }}
                />
              </section>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

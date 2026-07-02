import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

type TutorialStep = {
  id: string
  pathname: string
  targetId: string
  title: string
  description: string
  beforeShow?: () => void
}

type TargetRect = {
  top: number
  left: number
  width: number
  height: number
}

const TUTORIAL_PARAM = 'tutorial'
const STEP_PARAM = 'step'
const TUTORIAL_SELECTED_DATE = '2026-07-05'

const tutorialSteps: TutorialStep[] = [
  {
    id: 'date',
    pathname: '/',
    targetId: 'sidebar-date-zone',
    title: '侧栏日历用于切换正在查看与安排的日期',
    description:
      '明黄色高亮日期表示当前日期（THIS DAY），浅色高亮日期表示今天（TODAY）。',
  },
  {
    id: 'grass',
    pathname: '/',
    targetId: 'home-grass-dock',
    title: '种草：点击+号，收纳“有空再做”',
    description:
      '你可以在此把想做但不是现在做的事放进种草清单。胶囊tag用于筛选；兴趣程度用于排序。如果同一批种草属性相同，可以直接批量添加。',
    beforeShow: () => {
      window.dispatchEvent(new CustomEvent('jflow:tutorial-close-todo-composer'))
      window.dispatchEvent(new CustomEvent('jflow:tutorial-open-grass-composer'))
    },
  },
  {
    id: 'composer',
    pathname: '/',
    targetId: 'todo-composer-main',
    title: 'Todo ：普通/拔草条目',
    description:
      '新建普通条目并输入内容，或者从种草清单里挑一项来执行。下方小字输入框可以添加备注。',
    beforeShow: () => {
      window.dispatchEvent(new CustomEvent('jflow:tutorial-close-grass-composer'))
      window.dispatchEvent(
        new CustomEvent('jflow:tutorial-open-todo-composer', {
          detail: { focus: 'segmented', mode: 'grass' },
        }),
      )
    },
  },
  {
    id: 'day-night',
    pathname: '/',
    targetId: 'todo-composer-time',
    title: '日夜切换',
    description:
      '用于标记白天与晚上的待办条目。设置里可以开启“夜间新增默认归属晚上”功能，让指定时间段内新增的 Todo 默认为晚上待办，否则始终默认为白天。可以通过修改条目和调整顺序来更改。',
    beforeShow: () => {
      window.dispatchEvent(new CustomEvent('jflow:tutorial-open-todo-composer'))
    },
  },
  {
    id: 'necessary',
    pathname: '/',
    targetId: 'todo-composer-necessary',
    title: '必要 + DDL',
    description:
      '必要事项必须设置 DDL，默认为当日。超出DDL未完成时会有逾期标志。对于分步事项，DDL为当前这一步的DDL。',
    beforeShow: () => {
      window.dispatchEvent(
        new CustomEvent('jflow:tutorial-open-todo-composer', {
          detail: { focus: 'necessary' },
        }),
      )
    },
  },
  {
    id: 'step-segment',
    pathname: '/',
    targetId: 'todo-composer-step-segment',
    title: '分步和分次',
    description:
      '分步事项在完成当前步骤后自动生成下一步。分次事项显示进度条，你可以拖动进度，记录今天推进到了哪里。',
    beforeShow: () => {
      window.dispatchEvent(
        new CustomEvent('jflow:tutorial-open-todo-composer', {
          detail: { focus: 'stepped' },
        }),
      )
    },
  },
  {
    id: 'repeat',
    pathname: '/',
    targetId: 'todo-composer-repeat',
    title: '重复事项',
    description:
      '按日历重复：适合固定周期出现的事情，不管上一次有没有完成，到了对应日期都会出现；完成后重复只有在当前这次完成后，才会生成下一次。重复周期支持 1-100 之间的日、周、月、年。',
    beforeShow: () => {
      window.dispatchEvent(
        new CustomEvent('jflow:tutorial-open-todo-composer', {
          detail: { focus: 'repeat' },
        }),
      )
    },
  },
  {
    id: 'sync',
    pathname: '/settings',
    targetId: 'settings-sync',
    title: '同步：利用本地文件夹同步',
    description:
      '你可以选择一个本地文件夹作为同步文件夹；如果这个文件夹本身位于坚果云、OneDrive、iCloud Drive、Dropbox、NAS 等会自动同步的目录里，就可以借助它们在不同设备之间交换数据。',
  },
  {
    id: 'more',
    pathname: '/grass-list',
    targetId: 'sidebar-secondary-nav',
    title: '种草清单、日志和其他设置',
    description:
      '种草清单可以查看和管理已经添加的种草条目，支持一键添加到今日Todo；日志为自动生成；用于回看某一天的 Todo 快照，可以一键复制 Markdown 格式；此外设置中还有更多自定义功能。',
  },
]

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const getStepIndexFromSearch = (value: string | null) => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed)) {
    return 0
  }

  return clamp(parsed, 0, tutorialSteps.length - 1)
}

const getTargetElement = (targetId: string) =>
  document.querySelector<HTMLElement>(`[data-tutorial-id="${targetId}"]`)

const getTodayDateKey = () => {
  const today = new Date()

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export function TutorialOverlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isActive = searchParams.get(TUTORIAL_PARAM) === '1'
  const currentStepIndex = getStepIndexFromSearch(searchParams.get(STEP_PARAM))
  const currentStep = tutorialSteps[currentStepIndex]
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)

  useEffect(() => {
    document.body.classList.toggle('jflow-tutorial-active', isActive)

    return () => {
      document.body.classList.remove('jflow-tutorial-active')
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive) {
      return
    }

    const expandWindowForTutorial = window.jflowDesktop?.expandWindowForTutorial

    if (typeof expandWindowForTutorial !== 'function') {
      return
    }

    expandWindowForTutorial().catch((error: unknown) => {
      console.warn('[J-Flow] Failed to expand window for tutorial', error)
    })
  }, [isActive])

  const goToStep = useCallback(
    (nextStepIndex: number, replace = false) => {
      const boundedStepIndex = clamp(nextStepIndex, 0, tutorialSteps.length - 1)
      const nextStep = tutorialSteps[boundedStepIndex]

      navigate(
        {
          pathname: nextStep.pathname,
          search: `?${TUTORIAL_PARAM}=1&${STEP_PARAM}=${boundedStepIndex}`,
        },
        { replace },
      )
    },
    [navigate],
  )

  const finishTutorial = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('jflow:tutorial-exit', {
        detail: { date: getTodayDateKey() },
      }),
    )

    navigate(
      {
        pathname: '/',
        search: '',
      },
      { replace: true },
    )
  }, [navigate])

  useEffect(() => {
    if (!isActive || location.pathname === currentStep.pathname) {
      return
    }

    goToStep(currentStepIndex, true)
  }, [currentStep.pathname, currentStepIndex, goToStep, isActive, location.pathname])

  useEffect(() => {
    if (!isActive || location.pathname !== currentStep.pathname) {
      return undefined
    }

    const timeoutIds = [0, 140, 320].map((delayMs) =>
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('jflow:tutorial-select-date', {
            detail: { date: TUTORIAL_SELECTED_DATE },
          }),
        )
      }, delayMs),
    )

    if (currentStep.beforeShow) {
      ;[120, 280].forEach((delayMs) => {
        timeoutIds.push(
          window.setTimeout(() => {
            currentStep.beforeShow?.()
          }, delayMs),
        )
      })
    }

    return () => {
      timeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
    }
  }, [currentStep, isActive, location.pathname])

  useEffect(() => {
    if (!isActive || location.pathname !== currentStep.pathname) {
      setTargetRect(null)
      return undefined
    }

    let frameId = 0
    const updateTargetRect = (shouldScroll = false) => {
      const targetElement = getTargetElement(currentStep.targetId)

      if (!targetElement) {
        setTargetRect(null)
        return
      }

      if (shouldScroll) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        })
      }

      frameId = window.requestAnimationFrame(() => {
        const rect = targetElement.getBoundingClientRect()
        const highlightRight = Math.min(rect.right, window.innerWidth - 12)
        const guideBarRect = document
          .querySelector<HTMLElement>('.tutorial-guide-bar')
          ?.getBoundingClientRect()
        const maxHighlightBottom = guideBarRect
          ? guideBarRect.top - 16
          : window.innerHeight - 226
        const highlightBottom = Math.min(rect.bottom, maxHighlightBottom)
        const needsMoreSpace = rect.bottom > maxHighlightBottom

        if (needsMoreSpace) {
          window.scrollBy({
            top: rect.bottom - maxHighlightBottom,
            behavior: 'smooth',
          })
        }

        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: Math.max(0, highlightRight - rect.left),
          height: Math.max(0, highlightBottom - rect.top),
        })
      })
    }

    const timeoutId = window.setTimeout(() => {
      updateTargetRect(true)
    }, 120)
    const intervalId = window.setInterval(updateTargetRect, 350)

    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [currentStep.pathname, currentStep.targetId, isActive, location.pathname])

  const progressPercent = useMemo(
    () => ((currentStepIndex + 1) / tutorialSteps.length) * 100,
    [currentStepIndex],
  )

  if (!isActive) {
    return null
  }

  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === tutorialSteps.length - 1
  const highlightStyle = targetRect
    ? {
        top: `${targetRect.top - 8}px`,
        left: `${targetRect.left - 8}px`,
        width: `${targetRect.width + 16}px`,
        height: `${targetRect.height + 16}px`,
      }
    : undefined

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label="功能教学">
      <div className="tutorial-overlay__scrim" />
      {highlightStyle ? <div className="tutorial-overlay__highlight" style={highlightStyle} /> : null}
      <section className="tutorial-guide-bar">
        <div className="tutorial-guide-bar__progress" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="tutorial-guide-bar__body">
          <div className="tutorial-guide-bar__copy">
            <div className="tutorial-guide-bar__meta">
              <p className="eyebrow">Guide</p>
              <span>
                {currentStepIndex + 1} / {tutorialSteps.length}
              </span>
            </div>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.description}</p>
          </div>
          <div className="tutorial-guide-bar__actions">
            <button className="ghost-button ghost-button--compact" type="button" onClick={finishTutorial}>
              跳过
            </button>
            <button
              className="ghost-button ghost-button--compact"
              type="button"
              disabled={isFirstStep}
              onClick={() => {
                goToStep(currentStepIndex - 1)
              }}
            >
              上一步
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                if (isLastStep) {
                  finishTutorial()
                  return
                }

                goToStep(currentStepIndex + 1)
              }}
            >
              {isLastStep ? '完成' : '下一步'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

import { type PropsWithChildren, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { getAppData } from '@/db'

type InitializationState =
  | {
      status: 'loading'
    }
  | {
      status: 'ready'
      initialized: boolean
    }
  | {
      status: 'error'
      message: string
    }

function InitializationStatusCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="page-grid page-grid--single">
      <SurfaceCard title={title} description={description} />
    </section>
  )
}

function useInitializationState() {
  const [state, setState] = useState<InitializationState>({
    status: 'loading',
  })

  useEffect(() => {
    let cancelled = false

    void getAppData()
      .then((appData) => {
        if (cancelled) {
          return
        }

        setState({
          status: 'ready',
          initialized: appData.settings.initialized,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setState({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Unknown initialization error',
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export function RequireInitialized({ children }: PropsWithChildren) {
  const state = useInitializationState()

  if (state.status === 'loading') {
    return (
      <InitializationStatusCard
        title="读取初始化状态"
        description="正在确认是否已完成首次初始化。"
      />
    )
  }

  if (state.status === 'error') {
    return (
      <InitializationStatusCard
        title="初始化状态读取失败"
        description={state.message}
      />
    )
  }

  if (!state.initialized) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

export function RequireUninitialized({ children }: PropsWithChildren) {
  const state = useInitializationState()

  if (state.status === 'loading') {
    return (
      <InitializationStatusCard
        title="准备初始化页面"
        description="正在加载本地默认设置。"
      />
    )
  }

  if (state.status === 'error') {
    return (
      <InitializationStatusCard
        title="初始化页面加载失败"
        description={state.message}
      />
    )
  }

  if (state.initialized) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}


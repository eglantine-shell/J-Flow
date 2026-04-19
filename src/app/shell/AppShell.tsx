import { Outlet, useLocation } from 'react-router-dom'

export function AppShell() {
  const location = useLocation()
  const metaLabel = location.pathname === '/setup' ? '初始化你的使用框架' : '把今天排得更清楚'

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="eyebrow">J-Flow</p>
          <h1>Decision-first daily flow</h1>
        </div>
        <p className="app-shell__meta">{metaLabel}</p>
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  )
}

import { Outlet, useLocation } from 'react-router-dom'

export function AppShell() {
  const location = useLocation()
  const metaLabel =
    location.pathname === '/setup' ? 'Task 4 setup flow' : 'Task 4 app entry'

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="eyebrow">J-Flow</p>
          <h1>Decision-First Todo Workspace</h1>
        </div>
        <p className="app-shell__meta">{metaLabel}</p>
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  )
}

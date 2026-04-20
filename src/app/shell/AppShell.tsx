import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__brand">J-Flow</p>
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  )
}

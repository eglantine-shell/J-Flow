import { Link, Outlet, useLocation } from 'react-router-dom'

export function AppShell() {
  const location = useLocation()
  const showSettingsEntry = location.pathname !== '/setup'

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__brand">J-Flow</p>
        {showSettingsEntry ? (
          <div className="app-shell__actions">
            <Link
              className={
                location.pathname === '/settings'
                  ? 'icon-button icon-button--toolbar icon-button--active'
                  : 'icon-button icon-button--toolbar'
              }
              to="/settings"
              aria-label="打开设置"
            >
              ⚙
            </Link>
          </div>
        ) : null}
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  )
}

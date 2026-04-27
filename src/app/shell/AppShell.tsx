import { Link, Outlet, useLocation } from 'react-router-dom'

import { SettingsIcon } from '@/components/ui/Icons'

export function AppShell() {
  const location = useLocation()
  const showSettingsEntry = location.pathname !== '/setup'
  const isSettingsPage = location.pathname === '/settings'

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__brand">J-Flow</p>
        {showSettingsEntry ? (
          <div className="app-shell__actions">
            <Link
              className={isSettingsPage ? 'icon-button icon-button--toolbar icon-button--active' : 'icon-button icon-button--toolbar'}
              to={isSettingsPage ? '/' : '/settings'}
              aria-label={isSettingsPage ? '返回主页' : '打开设置'}
              title={isSettingsPage ? '返回主页' : '打开设置'}
            >
              <SettingsIcon className="icon-button__icon" />
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

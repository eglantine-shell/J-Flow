import { createBrowserRouter } from 'react-router-dom'

import {
  RequireInitialized,
  RequireUninitialized,
} from '@/app/guards/InitializationGuard'
import { AppShell } from '@/app/shell/AppShell'
import { HomePage } from '@/pages/home/HomePage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { SetupPage } from '@/pages/setup/SetupPage'

const routerBase = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: (
          <RequireInitialized>
            <HomePage />
          </RequireInitialized>
        ),
      },
      {
        path: 'settings',
        element: (
          <RequireInitialized>
            <SettingsPage />
          </RequireInitialized>
        ),
      },
      {
        path: 'setup',
        element: (
          <RequireUninitialized>
            <SetupPage />
          </RequireUninitialized>
        ),
      },
    ],
  },
], {
  basename: routerBase,
})

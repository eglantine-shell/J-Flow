import { createBrowserRouter, createHashRouter } from 'react-router-dom'

import {
  RequireInitialized,
  RequireUninitialized,
} from '@/app/guards/InitializationGuard'
import { AppShell } from '@/app/shell/AppShell'
import { GrassListPage } from '@/pages/grass-list/GrassListPage'
import { HomePage } from '@/pages/home/HomePage'
import { LogbookPage } from '@/pages/logbook/LogbookPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { SetupPage } from '@/pages/setup/SetupPage'

const normalizedBaseUrl =
  import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL

const routerBase = normalizedBaseUrl.replace(/\/+$/, '') || '/'

const routes = [
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
        path: 'grass-list',
        element: (
          <RequireInitialized>
            <GrassListPage />
          </RequireInitialized>
        ),
      },
      {
        path: 'logbook',
        element: (
          <RequireInitialized>
            <LogbookPage />
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
]

const shouldUseHashRouter =
  typeof window !== 'undefined' && window.location.protocol === 'file:'

export const router = (shouldUseHashRouter ? createHashRouter : createBrowserRouter)(routes, {
  basename: routerBase,
})

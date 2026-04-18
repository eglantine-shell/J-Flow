import { createBrowserRouter } from 'react-router-dom'

import {
  RequireInitialized,
  RequireUninitialized,
} from '@/app/guards/InitializationGuard'
import { AppShell } from '@/app/shell/AppShell'
import { HomePage } from '@/pages/home/HomePage'
import { SetupPage } from '@/pages/setup/SetupPage'

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
        path: 'setup',
        element: (
          <RequireUninitialized>
            <SetupPage />
          </RequireUninitialized>
        ),
      },
    ],
  },
])

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from '@/app/router'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

if (window.jflowDesktop) {
  void Promise.all([
    window.jflowDesktop.getAppInfo(),
    window.jflowDesktop.getDataPath(),
  ])
    .then(([appInfo, dataPath]) => {
      console.info('[J-Flow Desktop]', {
        appInfo,
        dataPath,
      })
    })
    .catch((error: unknown) => {
      console.error('[J-Flow Desktop] IPC check failed', error)
    })
}

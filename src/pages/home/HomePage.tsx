import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { AppShellContextValue } from '@/app/shell/AppShell'
import { SaveIcon } from '@/components/ui/Icons'
import { CreateTaskTemplateForm } from '@/features/templates'
import { TodoModePanel } from '@/features/todo'

export function HomePage() {
  const { selectedDate } = useOutletContext<AppShellContextValue>()
  const [showComposer, setShowComposer] = useState(false)
  const [canSaveGrass, setCanSaveGrass] = useState(false)
  const [isSavingGrass, setIsSavingGrass] = useState(false)

  return (
    <div className="home-layout home-layout--desktop">
      <section className="home-main home-main--workspace">
        <TodoModePanel selectedDate={selectedDate} />
      </section>

      <section className="home-layout__composer">
        <div className="surface-card surface-card--compact home-dock-card home-dock-card--sheet">
          <div className="composer-entry composer-entry--toolbar">
            <div className="composer-entry__summary">
              <p className="eyebrow">Grass</p>
              <span className="composer-entry__title">种草</span>
            </div>
            <div className="composer-entry__actions">
              <button
                className="icon-button icon-button--toolbar"
                type="button"
                aria-label={showComposer ? '收起新增种草' : '展开新增种草'}
                onClick={() => {
                  setShowComposer((current) => !current)
                }}
              >
                {showComposer ? '−' : '+'}
              </button>

              <button
                className="icon-button icon-button--toolbar"
                type="submit"
                form="grass-create-form"
                aria-label={isSavingGrass ? '保存种草中' : '保存种草'}
                disabled={!showComposer || !canSaveGrass || isSavingGrass}
              >
                <SaveIcon className="icon-button__icon" />
              </button>
            </div>
          </div>

          {showComposer ? (
            <div className="composer-panel composer-panel--dock">
              <CreateTaskTemplateForm
                formId="grass-create-form"
                onSubmitStateChange={({ canSubmit, isSaving }) => {
                  setCanSaveGrass(canSubmit)
                  setIsSavingGrass(isSaving)
                }}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

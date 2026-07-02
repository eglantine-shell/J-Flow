import { TemplateManagerPanel } from '@/features/templates'

export function GrassListPage() {
  return (
    <div className="page-stack">
      <section
        className="surface-card surface-card--compact page-panel page-panel--manager"
        data-tutorial-id="grass-list-page"
      >
        <div className="page-stack__header">
          <p className="eyebrow">Grass List</p>
          <h2>种草清单</h2>
        </div>
        <div className="page-panel__body page-panel__body--manager">
          <TemplateManagerPanel />
        </div>
      </section>
    </div>
  )
}

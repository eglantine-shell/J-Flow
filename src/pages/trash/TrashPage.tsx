export function TrashPage() {
  return (
    <div className="page-stack">
      <section className="surface-card surface-card--compact page-panel page-panel--placeholder">
        <div className="page-stack__header">
          <p className="eyebrow">Trash</p>
          <h2>垃圾桶</h2>
        </div>

        <div className="empty-state-card empty-state-card--manager">
          <p>功能开发中，下次更新可能在此处分类储存近期删除的普通todo事项和拔草清单条目，并支持删除后恢复。</p>
        </div>
      </section>
    </div>
  )
}

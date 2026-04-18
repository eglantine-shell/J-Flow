import type { PropsWithChildren, ReactNode } from 'react'

type SurfaceCardProps = PropsWithChildren<{
  title: string
  description?: ReactNode
}>

export function SurfaceCard({
  title,
  description,
  children,
}: SurfaceCardProps) {
  return (
    <section className="surface-card">
      <div className="surface-card__header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children ? <div className="surface-card__content">{children}</div> : null}
    </section>
  )
}


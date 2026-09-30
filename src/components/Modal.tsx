import type { PropsWithChildren, ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({ open, title, eyebrow, onClose, children, footer }: PropsWithChildren<{ open: boolean; title: string; eyebrow?: string; onClose: () => void; footer?: ReactNode }>) {
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-head">
        <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-foot">{footer}</footer>}
    </section>
  </div>
}

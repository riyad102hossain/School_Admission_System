import type { ReactNode } from 'react'

interface AlertProps {
  kind?: 'error' | 'success' | 'info'
  children: ReactNode
  onClose?: () => void
}

export function Alert({ kind = 'error', children, onClose }: AlertProps) {
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="বন্ধ করুন">
          ×
        </button>
      )}
    </div>
  )
}

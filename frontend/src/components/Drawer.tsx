import { useId, useRef } from 'react'
import useModalFocus from '../hooks/useModalFocus'
import Icon from './Icon'
import type { ReactNode, RefObject } from 'react'
import styles from './Drawer.module.css'

interface DrawerProps {
  title: string
  children: ReactNode
  footer?: ReactNode
  backgroundRef: RefObject<HTMLDivElement>
  onClose: () => void
}

export default function Drawer({ title, children, footer, backgroundRef, onClose }: DrawerProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  useModalFocus(dialogRef, backgroundRef, onClose)

  return (
    <div className={styles.layer}>
      <button className={styles.backdrop} type="button" tabIndex={-1} aria-label="关闭抽屉遮罩" onClick={onClose} />
      <div ref={dialogRef} className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.header}>
          <h2 id={titleId}>{title}</h2>
          <button className={styles.close} type="button" aria-label="关闭抽屉" onClick={onClose}><Icon name="close" /></button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  )
}

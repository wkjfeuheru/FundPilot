import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'

export default function useModalFocus(
  dialogRef: RefObject<HTMLDivElement>,
  backgroundRef: RefObject<HTMLDivElement>,
  onClose: () => void,
) {
  // URL-backed drawer controls may replace the close callback; retain the original focus owner.
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose }, [onClose])
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const background = backgroundRef.current
    if (!dialog) return
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    const wasInert = background?.hasAttribute('inert') ?? false
    background?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    dialog.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const controls = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    dialog.addEventListener('keydown', handleKeyDown)
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (!wasInert) background?.removeAttribute('inert')
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [dialogRef, backgroundRef])
}

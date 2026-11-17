import { useLayoutEffect } from 'react'
import type { ShellMode } from '../app/pages'

export default function useProductTheme(mode: ShellMode) {
  useLayoutEffect(() => {
    const alreadyPresent = document.body.classList.contains(mode)
    document.body.classList.add(mode)
    return () => {
      if (!alreadyPresent) document.body.classList.remove(mode)
    }
  }, [mode])
}

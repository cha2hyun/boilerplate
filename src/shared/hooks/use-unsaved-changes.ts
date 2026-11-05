import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useBlocker } from '@tanstack/react-router'

interface UnsavedChangesOptions {
  dirty: boolean
  pending?: boolean
  focusRef: RefObject<HTMLElement | null>
  fallbackFocusRef?: RefObject<HTMLElement | null>
}

/** One confirmation owns one attempted action; later attempts stay blocked. */
export function useUnsavedChanges({
  dirty,
  pending = false,
  focusRef,
  fallbackFocusRef,
}: UnsavedChangesOptions) {
  const stateRef = useRef({ dirty, pending })
  const resolveRef = useRef<((discard: boolean) => void) | null>(null)
  const restoreFocusRef = useRef(false)
  const [open, setOpen] = useState(false)

  const settle = useCallback((discard: boolean) => {
    const resolve = resolveRef.current
    if (!resolve) return
    resolveRef.current = null
    restoreFocusRef.current = !discard
    setOpen(false)
    resolve(discard)
  }, [])

  useLayoutEffect(() => {
    stateRef.current = { dirty, pending }
    if (!dirty && !pending) settle(false)
  }, [dirty, pending, settle])

  useLayoutEffect(
    () => () => {
      // Never leave a Router navigation promise waiting on an unmounted form.
      resolveRef.current?.(false)
      resolveRef.current = null
    },
    [],
  )

  const requestLeave = useCallback((): Promise<boolean> => {
    if (stateRef.current.pending || resolveRef.current) return Promise.resolve(false)
    if (!stateRef.current.dirty) return Promise.resolve(true)
    restoreFocusRef.current = true
    setOpen(true)
    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const shouldBlockFn = useCallback(async () => !(await requestLeave()), [requestLeave])
  const enableBeforeUnload = useCallback(
    () => stateRef.current.dirty || stateRef.current.pending,
    [],
  )
  useBlocker({ shouldBlockFn, enableBeforeUnload })

  return {
    requestLeave,
    // Success can close/navigate in the same event before React commits clean props.
    markSaved() {
      stateRef.current = { dirty: false, pending: false }
      settle(false)
    },
    dialogProps: {
      open,
      onOpenChange(nextOpen: boolean) {
        if (!nextOpen) settle(false)
      },
      onDiscard() {
        settle(true)
      },
      onCloseAutoFocus(event: Event) {
        event.preventDefault()
        const target = focusRef.current?.isConnected ? focusRef.current : fallbackFocusRef?.current
        if (restoreFocusRef.current && target?.isConnected) {
          target.focus()
        }
      },
    },
  }
}

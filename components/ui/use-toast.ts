import * as React from 'react'

type ToastVariant = 'default' | 'destructive'

export type ToastProps = {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastItem = ToastProps & {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ToastState = {
  toasts: ToastItem[]
}

type ToastAction =
  | { type: 'ADD_TOAST'; toast: ToastItem }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string }

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000

let count = 0
const genId = () => {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const listeners: Array<(state: ToastState) => void> = []
let memoryState: ToastState = { toasts: [] }

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((l) => l(memoryState))
}

const reducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST':
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) }

    case 'DISMISS_TOAST': {
      const { toastId } = action

      const scheduleRemove = (id: string) => {
        if (toastTimeouts.has(id)) return
        const timeout = setTimeout(() => {
          toastTimeouts.delete(id)
          dispatch({ type: 'REMOVE_TOAST', toastId: id })
        }, TOAST_REMOVE_DELAY)
        toastTimeouts.set(id, timeout)
      }

      if (toastId) {
        scheduleRemove(toastId)
      } else {
        state.toasts.forEach((t) => scheduleRemove(t.id))
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          toastId ? (t.id === toastId ? { ...t, open: false } : t) : { ...t, open: false }
        ),
      }
    }

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: action.toastId ? state.toasts.filter((t) => t.id !== action.toastId) : [],
      }

    default:
      return state
  }
}

function dismiss(toastId?: string) {
  dispatch({ type: 'DISMISS_TOAST', toastId })
}

export function toast(props: ToastProps) {
  const id = genId()

  const item: ToastItem = {
    ...props,
    id,
    open: true,
    onOpenChange: (open) => {
      if (!open) dismiss(id)
    },
  }

  dispatch({ type: 'ADD_TOAST', toast: item })

  return {
    id,
    dismiss: () => dismiss(id),
    update: (next: ToastProps) => {
      const updated: ToastItem = { ...item, ...next, id }
      dispatch({ type: 'ADD_TOAST', toast: updated })
    },
  }
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const i = listeners.indexOf(setState)
      if (i > -1) listeners.splice(i, 1)
    }
  }, [])

  return { ...state, toast, dismiss }
}

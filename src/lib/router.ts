// Two routes, no nesting, no params. Swap for a real router if that changes.
import { useSyncExternalStore } from 'react'

export const ROUTES = ['/home', '/offer'] as const
export type Route = (typeof ROUTES)[number]

export const HOME: Route = '/home'

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('popstate', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('popstate', onChange)
  }
}

function readPath(): string {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

export function normalise(path: string): Route {
  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : HOME
}

export function navigate(to: Route, options: { replace?: boolean } = {}) {
  if (readPath() === to) return
  window.history[options.replace ? 'replaceState' : 'pushState']({}, '', to)
  emit()
}

export function useRoute(): Route {
  const path = useSyncExternalStore(subscribe, readPath, () => HOME)
  return normalise(path)
}

export function isUnknownPath(): boolean {
  return !(ROUTES as readonly string[]).includes(readPath())
}

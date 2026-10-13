import { lazy, Suspense, type ComponentProps } from 'react'

const LocationMap = lazy(() => import('./LocationMap'))

/** Loads MapLibre only when a map is actually on screen. */
export function LazyLocationMap(props: ComponentProps<typeof LocationMap>) {
  return (
    <Suspense fallback={<div className="size-full animate-pulse bg-surface" />}>
      <LocationMap {...props} />
    </Suspense>
  )
}

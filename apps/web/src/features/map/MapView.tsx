import 'maplibre-gl/dist/maplibre-gl.css'

import type { SlotSummary } from '@grouppace/shared'
import clsx from 'clsx'
import { MapPin } from 'lucide-react'
import { Component, useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import MapGL, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import { SlotCard } from '../slots/SlotCard'
import { SPORT_META } from '../slots/meta'

// MapLibre locates its worker relative to its own module URL, which bundling rewrites,
// so hand it the worker file explicitly (works in dev and in production builds).
setWorkerUrl(maplibreWorkerUrl)

// CARTO's Dark Matter basemap needs no API key. Swap in a Mapbox/MapTiler style via env.
const STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ??
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const DEFAULT_VIEW = { longitude: 4.8852, latitude: 52.3676, zoom: 12 }
const FIT_OPTIONS = { padding: { top: 64, bottom: 160, left: 48, right: 48 }, maxZoom: 14 }

type Bounds = [[number, number], [number, number]]

function boundsOf(slots: SlotSummary[]): Bounds | null {
  if (slots.length === 0) return null
  const lngs = slots.map((slot) => slot.meetingPoint.lng)
  const lats = slots.map((slot) => slot.meetingPoint.lat)
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

interface MapViewProps {
  slots: SlotSummary[]
  selectedSlotId: string | null
  onSelectSlot: (slotId: string | null) => void
  onOpenInTimeline: (slotId: string) => void
}

export default function MapView(props: MapViewProps) {
  return (
    <MapErrorBoundary>
      <SlotMap {...props} />
    </MapErrorBoundary>
  )
}

function SlotMap({ slots, selectedSlotId, onSelectSlot, onOpenInTimeline }: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const selected = slots.find((slot) => slot.id === selectedSlotId)
  const bounds = useMemo(() => boundsOf(slots), [slots])

  // Re-frame when the day or filter changes (the initial frame comes from initialViewState).
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (bounds) mapRef.current?.fitBounds(bounds, { ...FIT_OPTIONS, duration: 600 })
  }, [bounds])

  return (
    <div className="relative h-full">
      <MapGL
        ref={mapRef}
        initialViewState={bounds ? { bounds, fitBoundsOptions: FIT_OPTIONS } : DEFAULT_VIEW}
        mapStyle={STYLE_URL}
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%' }}
        onClick={() => onSelectSlot(null)}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {slots.map((slot) => (
          <Marker
            key={slot.id}
            longitude={slot.meetingPoint.lng}
            latitude={slot.meetingPoint.lat}
            anchor="bottom"
            style={{ zIndex: slot.id === selectedSlotId ? 1 : 0 }}
            onClick={(event) => {
              event.originalEvent.stopPropagation() // keep the map's click from clearing it
              onSelectSlot(slot.id)
            }}
          >
            <Pin slot={slot} selected={slot.id === selectedSlotId} />
          </Marker>
        ))}
      </MapGL>

      <div className="pointer-events-none absolute inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {selected ? (
          <div className="pointer-events-auto h-26.5 motion-safe:animate-card-in" key={selected.id}>
            <SlotCard slot={selected} selected onSelect={onOpenInTimeline} />
          </div>
        ) : (
          <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 shadow-lg backdrop-blur">
            <MapPin className="size-3.5 text-volt" aria-hidden />
            {slots.length > 0
              ? 'Tap a meeting spot to preview the workout'
              : 'No meeting spots for this day'}
          </p>
        )}
      </div>
    </div>
  )
}

function Pin({ slot, selected }: { slot: SlotSummary; selected: boolean }) {
  const { Icon, accent } = SPORT_META[slot.sportType]
  return (
    <button
      type="button"
      aria-label={`${slot.title}, ${slot.startTime} at ${slot.meetingPoint.name}`}
      aria-pressed={selected}
      style={{ '--accent': accent } as CSSProperties}
      className={clsx(
        'flex origin-bottom flex-col items-center transition-transform duration-200 ease-out',
        selected ? 'scale-115' : 'hover:scale-105',
        slot.status === 'CANCELLED' && 'opacity-50',
      )}
    >
      <span
        className={clsx(
          'flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold tabular-nums shadow-lg shadow-black/50',
          selected
            ? 'bg-(--accent) text-slate-950'
            : 'bg-slate-900 text-white ring-1 ring-(--accent)/70',
        )}
      >
        <Icon className={clsx('size-3.5', !selected && 'text-(--accent)')} aria-hidden />
        {slot.startTime}
      </span>
      <span
        aria-hidden
        className={clsx(
          '-mt-px size-0 border-x-[6px] border-t-[7px] border-x-transparent',
          selected ? 'border-t-(--accent)' : 'border-t-slate-900',
        )}
      />
    </button>
  )
}

/** MapLibre needs WebGL; degrade to a message instead of a blank screen when it's missing. */
class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-white">The map couldn't load</p>
          <p className="mt-1 text-xs text-slate-400">
            Your browser may not support WebGL. The timeline still has every workout.
          </p>
        </div>
      </div>
    )
  }
}

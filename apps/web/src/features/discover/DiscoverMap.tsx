import 'maplibre-gl/dist/maplibre-gl.css'

import type { SlotSummary, UserSlot } from '@grouppace/shared'
import clsx from 'clsx'
import { MapPin } from 'lucide-react'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import MapGL, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import { MapErrorBoundary } from '../../components/maps/MapErrorBoundary'
import { DEFAULT_CENTER, MAP_STYLE_URL } from '../../lib/map'
import { SlotCard } from '../slots/SlotCard'
import { SPORT_META } from '../slots/meta'

const FIT_OPTIONS = { padding: { top: 56, bottom: 170, left: 48, right: 48 }, maxZoom: 14 }

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

interface DiscoverMapProps {
  slots: SlotSummary[]
  focusedSlotId: string | null
  onFocusSlot: (slotId: string | null) => void
  roles: Map<string, UserSlot['role']>
}

export default function DiscoverMap(props: DiscoverMapProps) {
  return (
    <MapErrorBoundary>
      <SlotMap {...props} />
    </MapErrorBoundary>
  )
}

function SlotMap({ slots, focusedSlotId, onFocusSlot, roles }: DiscoverMapProps) {
  const mapRef = useRef<MapRef>(null)
  const focused = slots.find((slot) => slot.id === focusedSlotId)
  const bounds = useMemo(() => boundsOf(slots), [slots])

  // Re-frame when the day or filter changes (the first frame comes from initialViewState).
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
        initialViewState={
          bounds
            ? { bounds, fitBoundsOptions: FIT_OPTIONS }
            : { longitude: DEFAULT_CENTER.lng, latitude: DEFAULT_CENTER.lat, zoom: 12 }
        }
        mapStyle={MAP_STYLE_URL}
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%' }}
        onClick={() => onFocusSlot(null)}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {slots.map((slot) => (
          <Marker
            key={slot.id}
            longitude={slot.meetingPoint.lng}
            latitude={slot.meetingPoint.lat}
            anchor="bottom"
            style={{ zIndex: slot.id === focusedSlotId ? 1 : 0 }}
            onClick={(event) => {
              event.originalEvent.stopPropagation() // keep the map's click from clearing it
              onFocusSlot(slot.id)
            }}
          >
            <Pin slot={slot} focused={slot.id === focusedSlotId} />
          </Marker>
        ))}
      </MapGL>

      <div className="pointer-events-none absolute inset-x-3 bottom-3">
        {focused ? (
          <div className="pointer-events-auto h-27 motion-safe:animate-rise" key={focused.id}>
            <SlotCard slot={focused} focused role={roles.get(focused.id)} />
          </div>
        ) : (
          <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-line bg-raised/95 px-3 py-1.5 text-[13px] text-zinc-300 shadow-lg">
            <MapPin className="size-3.5 text-volt" aria-hidden />
            {slots.length > 0 ? 'Tap a pin to see the workout' : 'No meeting spots on this day'}
          </p>
        )}
      </div>
    </div>
  )
}

function Pin({ slot, focused }: { slot: SlotSummary; focused: boolean }) {
  const { Icon, accent } = SPORT_META[slot.sportType]
  return (
    <button
      type="button"
      aria-label={`${slot.title}, ${slot.startTime} at ${slot.meetingPoint.name}`}
      aria-pressed={focused}
      style={{ '--accent': accent } as CSSProperties}
      className={clsx(
        'flex origin-bottom flex-col items-center transition-transform duration-200 ease-out',
        focused ? 'scale-110' : 'hover:scale-105',
        slot.status === 'CANCELLED' && 'opacity-50',
      )}
    >
      <span
        className={clsx(
          'flex items-center gap-1 rounded-full px-2 py-1 font-display text-[14px] leading-none font-bold tabular shadow-lg shadow-black/50',
          focused ? 'bg-(--accent) text-black' : 'bg-ink text-white ring-1 ring-(--accent)/80',
        )}
      >
        <Icon className={clsx('size-3.5', !focused && 'text-(--accent)')} aria-hidden />
        {slot.startTime}
      </span>
      <span
        aria-hidden
        className={clsx(
          '-mt-px size-0 border-x-[6px] border-t-[7px] border-x-transparent',
          focused ? 'border-t-(--accent)' : 'border-t-ink',
        )}
      />
    </button>
  )
}

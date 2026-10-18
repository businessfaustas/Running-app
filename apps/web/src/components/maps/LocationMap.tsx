import 'maplibre-gl/dist/maplibre-gl.css'

import { useEffect, useRef } from 'react'
import MapGL, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import { DEFAULT_CENTER, MAP_STYLE_URL } from '../../lib/map'
import { MapErrorBoundary } from './MapErrorBoundary'

export interface LngLat {
  lng: number
  lat: number
}

interface LocationMapProps {
  point: LngLat | null
  /** Makes the map pickable: tap or drag the pin to choose a spot. */
  onPick?: (point: LngLat) => void
  accent?: string
  zoom?: number
  /** Where to look while there's no point yet, e.g. the person's town. */
  fallbackCenter?: LngLat
}

/** A single meeting point. Read-only unless `onPick` is given. */
export default function LocationMap(props: LocationMapProps) {
  return (
    <MapErrorBoundary>
      <PointMap {...props} />
    </MapErrorBoundary>
  )
}

function PointMap({
  point,
  onPick,
  accent = 'var(--color-volt)',
  zoom = 14,
  fallbackCenter = DEFAULT_CENTER,
}: LocationMapProps) {
  const mapRef = useRef<MapRef>(null)
  const center = point ?? fallbackCenter

  // Follow the point when it's changed from outside (preset spots, "use my location").
  useEffect(() => {
    if (point) mapRef.current?.easeTo({ center: [point.lng, point.lat], duration: 500 })
  }, [point])

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{ longitude: center.lng, latitude: center.lat, zoom }}
      mapStyle={MAP_STYLE_URL}
      interactive={Boolean(onPick)}
      attributionControl={{ compact: true }}
      style={{ width: '100%', height: '100%' }}
      onClick={onPick ? (e) => onPick({ lng: e.lngLat.lng, lat: e.lngLat.lat }) : undefined}
    >
      {onPick && <NavigationControl position="top-right" showCompass={false} />}
      {point && (
        <Marker
          longitude={point.lng}
          latitude={point.lat}
          anchor="bottom"
          draggable={Boolean(onPick)}
          onDragEnd={(e) => onPick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat })}
        >
          <svg width="30" height="38" viewBox="0 0 30 38" aria-hidden>
            <path
              d="M15 37c-1-3-14-14-14-22a14 14 0 0 1 28 0c0 8-13 19-14 22Z"
              fill={accent}
              stroke="#0b0b0c"
              strokeWidth="2"
            />
            <circle cx="15" cy="15" r="5" fill="#0b0b0c" />
          </svg>
        </Marker>
      )}
    </MapGL>
  )
}

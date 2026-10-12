import { customType } from 'drizzle-orm/pg-core'

export interface LngLat {
  lng: number
  lat: number
}

/**
 * PostGIS `geometry(Point, 4326)` (WGS84). drizzle's built-in `geometry` column drops the
 * SRID, hence the custom type. Cast to `::geography` for distances in metres.
 */
export const pointGeometry = customType<{ data: LngLat; driverData: string }>({
  dataType: () => 'geometry(Point, 4326)',
  toDriver: ({ lng, lat }) => `SRID=4326;POINT(${lng} ${lat})`,
  fromDriver: parseEwkbPoint,
})

/** Decodes the hex EWKB string Postgres returns for a point column. */
export function parseEwkbPoint(hex: string): LngLat {
  const bytes = Buffer.from(hex, 'hex')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const littleEndian = view.getUint8(0) === 1
  const type = view.getUint32(1, littleEndian)
  if ((type & 0xffff) !== 1) throw new Error(`Expected a WKB point, got type ${type}`)
  const hasSrid = (type & 0x20000000) !== 0
  const offset = hasSrid ? 9 : 5
  return {
    lng: view.getFloat64(offset, littleEndian),
    lat: view.getFloat64(offset + 8, littleEndian),
  }
}

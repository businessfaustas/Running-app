import { z } from 'zod'
import { SPORT_TYPES } from './domain'

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

/** Query string for `GET /slots`. */
export const listSlotsQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    /** Comma-separated subset of SPORT_TYPES, e.g. `RUN,TRACK`. */
    sport: z
      .string()
      .transform((value) => value.split(',').filter(Boolean))
      .pipe(z.array(z.enum(SPORT_TYPES)))
      .optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(200).default(25),
  })
  .refine((q) => q.from <= q.to, { message: '`from` must be on or before `to`' })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    message: '`lat` and `lng` must be provided together',
  })

export type ListSlotsQuery = z.infer<typeof listSlotsQuerySchema>

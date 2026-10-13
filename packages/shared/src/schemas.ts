import { z } from 'zod'
import { SPORT_TYPES, VIBE_TAGS } from './domain'

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

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm')

/** Validates a new workout before it's sent to the backend (used by the form and the API). */
export const newSlotInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Give it a name').max(120),
    sportType: z.enum(SPORT_TYPES),
    date: isoDateSchema,
    startTime: timeSchema,
    endTime: timeSchema.nullable(),
    distanceKm: z.number().positive('Distance must be above 0').max(400),
    targetPace: z.string().trim().min(1, 'Add a target pace or speed').max(60),
    vibeTag: z.enum(VIBE_TAGS),
    description: z.string().trim().max(1000).nullable(),
    meetingPoint: z.object({
      name: z.string().trim().min(2, 'Name the meeting point').max(120),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    maxParticipants: z.number().int().min(2).max(200).nullable(),
  })
  .refine((s) => s.endTime === null || s.endTime > s.startTime, {
    message: 'It has to finish after it starts',
    path: ['endTime'],
  })

import { z } from 'zod'
import { CLUB_TYPES, REPORT_REASONS, SPORT_TYPES, VIBE_TAGS } from './domain'

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data turi būti MMMM-MM-DD')

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

/** Longest workout distance – room for multi-day rides and ultras. */
export const MAX_DISTANCE_KM = 1000

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Laikas turi būti VV:mm')

/** Validates a new workout before it's sent to the backend (used by the form and the API). */
export const newSlotInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Sugalvok pavadinimą').max(120),
    sportType: z.enum(SPORT_TYPES),
    date: isoDateSchema,
    startTime: timeSchema,
    endTime: timeSchema.nullable(),
    distanceKm: z
      .number()
      .positive('Atstumas turi būti didesnis nei 0')
      .max(MAX_DISTANCE_KM, `Atstumas per didelis – daugiausia ${MAX_DISTANCE_KM} km`),
    targetPace: z.string().trim().min(1, 'Nurodyk tempą arba greitį').max(60),
    vibeTag: z.enum(VIBE_TAGS),
    description: z.string().trim().max(1000).nullable(),
    meetingPoint: z.object({
      name: z.string().trim().min(2, 'Įvardyk susitikimo vietą').max(120),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    maxParticipants: z.number().int().min(2).max(200).nullable(),
  })
  .refine((s) => s.endTime === null || s.endTime > s.startTime, {
    message: 'Pabaiga turi būti po pradžios',
    path: ['endTime'],
  })

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Patikrink el. pašto adresą')
const linkSchema = z
  .string()
  .trim()
  .regex(/^https:\/\/\S{4,200}$/, 'Nuoroda turi prasidėti https:// ir būti be tarpų')
  .nullable()

/** The "add your club" form; the database checks the same limits. */
export const newClubInputSchema = z.object({
  name: z.string().trim().min(3, 'Įvesk klubo pavadinimą').max(80, 'Pavadinimas per ilgas'),
  types: z
    .array(z.enum(CLUB_TYPES))
    .min(1, 'Pasirink bent vieną sportą')
    .max(3, 'Pasirink daugiausia tris sportus'),
  city: z.string().trim().min(2, 'Pasirink miestą').max(40),
  description: z
    .string()
    .trim()
    .min(20, 'Aprašyk klubą bent keliais sakiniais (nuo 20 simbolių)')
    .max(600, 'Aprašymas per ilgas – iki 600 simbolių'),
  schedule: z
    .array(z.string().trim().min(3).max(120, 'Tvarkaraščio eilutė per ilga'))
    .max(5, 'Daugiausia 5 tvarkaraščio eilutės'),
  meetingPlace: z.string().trim().max(120).nullable(),
  website: linkSchema,
  facebook: linkSchema,
  instagram: linkSchema,
  strava: linkSchema,
  email: emailSchema.nullable(),
  location: z.object({
    lat: z.number().min(53.8, 'Vieta turi būti Lietuvoje').max(56.5, 'Vieta turi būti Lietuvoje'),
    lng: z.number().min(20.9, 'Vieta turi būti Lietuvoje').max(26.9, 'Vieta turi būti Lietuvoje'),
  }),
})

/** A notice about content. Visitors give a name and email; the database checks the same. */
export const newReportSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  path: z.string().regex(/^\/[A-Za-z0-9/_.-]{0,200}$/),
  targetId: z.string().max(100).nullable(),
  reason: z.enum(REPORT_REASONS, { message: 'Pasirink, kas negerai' }),
  details: z
    .string()
    .trim()
    .min(10, 'Paaiškink plačiau – bent 10 simbolių')
    .max(2000, 'Paaiškinimas per ilgas – iki 2000 simbolių'),
  reporterName: z.string().trim().min(2, 'Įvesk vardą').max(120).nullable(),
  reporterEmail: emailSchema.nullable(),
})

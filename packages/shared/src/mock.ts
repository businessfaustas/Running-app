import type { Profile, SlotStatus, SportType, VibeTag } from './domain'

/**
 * Sample data used by the web app (when no API is configured) and by the API seed script.
 * Slots are anchored to a day offset so the timeline always has something to show "today".
 */

export const MOCK_CITY_CENTER = { name: 'Amsterdam', lat: 52.3676, lng: 4.8852 } as const

const user = (n: number) => `a0000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
const slot = (n: number) => `b0000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
/** Placeholder portraits from randomuser.me for the demo athletes. */
const portrait = (path: string) => `https://randomuser.me/api/portraits/${path}.jpg`

export const MOCK_USERS: Profile[] = [
  {
    id: user(1),
    name: 'Maya Jansen',
    avatarUrl: portrait('women/44'),
    bio: 'Marathoner chasing sub-3:30. Will run for oat flat whites.',
    sports: ['running', 'cycling'],
    defaultPaces: { running_easy: '5:30/km', cycling_avg: '27 km/h' },
    stravaId: null,
  },
  {
    id: user(2),
    name: 'Luca Romano',
    avatarUrl: portrait('men/32'),
    bio: 'Road cyclist. Sunday café rides and Tuesday chain-gangs.',
    sports: ['cycling'],
    defaultPaces: { cycling_avg: '31 km/h' },
    stravaId: null,
  },
  {
    id: user(3),
    name: 'Aisha Bakker',
    avatarUrl: portrait('women/68'),
    bio: 'Trail & road. Always up for a chatty long run.',
    sports: ['running'],
    defaultPaces: { running_easy: '5:45/km', running_tempo: '4:50/km' },
    stravaId: null,
  },
  {
    id: user(4),
    name: 'Tom de Vries',
    avatarUrl: portrait('men/45'),
    bio: '800m on the track, 10K on the road.',
    sports: ['running'],
    defaultPaces: { running_easy: '5:00/km', running_tempo: '4:05/km' },
    stravaId: null,
  },
  {
    id: user(5),
    name: 'Sofia Lindqvist',
    avatarUrl: portrait('women/65'),
    bio: 'Gravel addict. If there is a dirt road, I am on it.',
    sports: ['cycling'],
    defaultPaces: { gravel_avg: '24 km/h', cycling_avg: '29 km/h' },
    stravaId: null,
  },
  {
    id: user(6),
    name: 'Jonas Weber',
    avatarUrl: portrait('men/22'),
    bio: 'Training for my first ultra.',
    sports: ['running'],
    defaultPaces: { running_easy: '5:40/km' },
    stravaId: null,
  },
  {
    id: user(7),
    name: 'Nora Visser',
    avatarUrl: portrait('women/12'),
    bio: 'Duathlete. Run, bike, run, coffee.',
    sports: ['running', 'cycling'],
    defaultPaces: { running_easy: '5:20/km', cycling_avg: '30 km/h' },
    stravaId: null,
  },
  {
    id: user(8),
    name: 'Kenji Sato',
    avatarUrl: portrait('men/75'),
    bio: 'Lunchtime runner, weekend parkrunner.',
    sports: ['running'],
    defaultPaces: { running_easy: '5:50/km' },
    stravaId: null,
  },
  {
    id: user(9),
    name: 'Priya Shah',
    avatarUrl: portrait('women/90'),
    bio: 'Coming back from injury — easy miles only for now.',
    sports: ['running'],
    defaultPaces: { running_easy: '6:10/km' },
    stravaId: null,
  },
  {
    id: user(10),
    name: 'Daan Mulder',
    avatarUrl: portrait('men/86'),
    bio: 'Track nerd and part-time pacer.',
    sports: ['running', 'cycling'],
    defaultPaces: { running_easy: '4:55/km', cycling_avg: '28 km/h' },
    stravaId: null,
  },
]

const SPOTS = {
  vondelpark: { name: 'Vondelpark · Openluchttheater', lat: 52.358, lng: 4.8686 },
  museumplein: { name: 'Museumplein · I amsterdam letters', lat: 52.3579, lng: 4.8818 },
  olympicTrack: { name: 'Olympisch Stadion track', lat: 52.3432, lng: 4.8547 },
  magereBrug: { name: 'Magere Brug (Amstel)', lat: 52.3634, lng: 4.9023 },
  westerpark: { name: 'Westerpark · Gashouder', lat: 52.3866, lng: 4.8757 },
  oosterpark: { name: 'Oosterpark main gate', lat: 52.36, lng: 4.92 },
  bosbaan: { name: 'Amsterdamse Bos · Bosbaan', lat: 52.3297, lng: 4.8329 },
  sloterplas: { name: 'Sloterplas beach', lat: 52.3653, lng: 4.8045 },
  ferryNoord: { name: 'Buiksloterweg ferry (Noord)', lat: 52.3829, lng: 4.9024 },
} as const

export interface MockSlotRecord {
  id: string
  hostId: string
  /** Days after "today" the slot takes place on. */
  dayOffset: number
  title: string
  sportType: SportType
  startTime: string
  endTime: string | null
  distanceKm: number
  targetPace: string
  vibeTag: VibeTag
  meetingPoint: { name: string; lat: number; lng: number }
  maxParticipants: number | null
  status: SlotStatus
  description: string | null
  /** Accepted participants other than the host, in join order. */
  participantIds: string[]
}

export const MOCK_SLOTS: MockSlotRecord[] = [
  // ── Today ──────────────────────────────────────────────────────────────
  {
    id: slot(1),
    hostId: user(4),
    dayOffset: 0,
    title: 'Sunrise Tempo 10K',
    sportType: 'RUN',
    startTime: '06:00',
    endTime: '07:00',
    distanceKm: 10,
    targetPace: '4:30–4:45 /km',
    vibeTag: 'PACE_PUSH',
    meetingPoint: SPOTS.vondelpark,
    maxParticipants: 8,
    status: 'OPEN',
    description:
      '3 km easy to warm up, 5 km at tempo, then a cool-down lap. We start on time, so lock your bike by the theatre a few minutes early.',
    participantIds: [user(3), user(6), user(8)],
  },
  {
    id: slot(2),
    hostId: user(5),
    dayOffset: 0,
    title: 'Waterland Gravel Loop',
    sportType: 'GRAVEL',
    startTime: '06:30',
    endTime: '09:30',
    distanceKm: 62,
    targetPace: '24–26 km/h',
    vibeTag: 'SOCIAL_CHAT',
    meetingPoint: SPOTS.ferryNoord,
    maxParticipants: 6,
    status: 'OPEN',
    description:
      'Ferry over at 06:30, then dikes and farm tracks up to Broek in Waterland. 35 mm tyres or wider. We regroup at every turn.',
    participantIds: [user(2)],
  },
  {
    id: slot(3),
    hostId: user(10),
    dayOffset: 0,
    title: 'Track Session: 8×400m',
    sportType: 'TRACK',
    startTime: '07:15',
    endTime: '08:15',
    distanceKm: 7,
    targetPace: '1:25 per 400m',
    vibeTag: 'INTERVALS',
    meetingPoint: SPOTS.olympicTrack,
    maxParticipants: 10,
    status: 'OPEN',
    description:
      '8 × 400 m with 200 m jog recovery. All speeds welcome, we split into lanes by pace.',
    participantIds: [user(9), user(7), user(1), user(4)],
  },
  {
    id: slot(4),
    hostId: user(1),
    dayOffset: 0,
    title: '15km Zone 2 Coffee Run',
    sportType: 'RUN',
    startTime: '10:00',
    endTime: '11:30',
    distanceKm: 15,
    targetPace: '5:15–5:30 /km',
    vibeTag: 'ZONE_2_COFFEE',
    meetingPoint: SPOTS.museumplein,
    maxParticipants: 6,
    status: 'OPEN',
    description:
      'Nobody gets dropped. We loop Vondelpark twice, then out along the Amstel. Coffee at Lot Sixty One afterwards, they only take cards.',
    participantIds: [user(3), user(6)],
  },
  {
    id: slot(5),
    hostId: user(8),
    dayOffset: 0,
    title: 'Lunch Break Shakeout',
    sportType: 'RUN',
    startTime: '12:15',
    endTime: '13:00',
    distanceKm: 7,
    targetPace: '5:45 /km',
    vibeTag: 'SOCIAL_CHAT',
    meetingPoint: SPOTS.oosterpark,
    maxParticipants: null,
    status: 'OPEN',
    description: "Two laps of Oosterpark and back. You'll be at your desk by 13:05.",
    participantIds: [user(9), user(10), user(3), user(7)],
  },
  {
    id: slot(6),
    hostId: user(2),
    dayOffset: 0,
    title: 'After-Work Road Ride',
    sportType: 'CYCLING',
    startTime: '17:30',
    endTime: '20:00',
    distanceKm: 70,
    targetPace: '30–32 km/h',
    vibeTag: 'PACE_PUSH',
    meetingPoint: SPOTS.magereBrug,
    maxParticipants: 6,
    status: 'FULL',
    description:
      'Out along the Amstel to Ouderkerk and back round the Ronde Hoep. Quick, but we wait at the top of each section. Lights required.',
    participantIds: [user(5), user(7), user(10), user(4), user(1)],
  },
  {
    id: slot(7),
    hostId: user(3),
    dayOffset: 0,
    title: 'Canal Run & Chat',
    sportType: 'RUN',
    startTime: '18:00',
    endTime: '19:00',
    distanceKm: 10,
    targetPace: '5:30–6:00 /km',
    vibeTag: 'SOCIAL_CHAT',
    meetingPoint: SPOTS.westerpark,
    maxParticipants: 12,
    status: 'OPEN',
    description:
      "Easy loop along the Westerpark canals. Good one if you're new to running in a group.",
    participantIds: [user(8), user(9), user(6)],
  },
  {
    id: slot(8),
    hostId: user(6),
    dayOffset: 0,
    title: 'Bosbaan Threshold Reps',
    sportType: 'RUN',
    startTime: '18:30',
    endTime: '19:30',
    distanceKm: 12,
    targetPace: '4:10–4:20 /km reps',
    vibeTag: 'INTERVALS',
    meetingPoint: SPOTS.bosbaan,
    maxParticipants: 5,
    status: 'OPEN',
    description:
      '4 × 2 km along the rowing course at threshold, 2 min float between. A headlamp helps after 19:00.',
    participantIds: [],
  },
  {
    id: slot(9),
    hostId: user(7),
    dayOffset: 0,
    title: 'Night Owl Easy Miles',
    sportType: 'RUN',
    startTime: '20:45',
    endTime: '21:30',
    distanceKm: 8,
    targetPace: '6:00 /km',
    vibeTag: 'ZONE_2_COFFEE',
    meetingPoint: SPOTS.sloterplas,
    maxParticipants: 4,
    status: 'OPEN',
    description: 'Two loops around Sloterplas with lights on. Nice way to end the day.',
    participantIds: [user(10)],
  },
  // ── Tomorrow ───────────────────────────────────────────────────────────
  {
    id: slot(10),
    hostId: user(6),
    dayOffset: 1,
    title: 'Long Run: 28K Amstel Out & Back',
    sportType: 'RUN',
    startTime: '08:00',
    endTime: '10:45',
    distanceKm: 28,
    targetPace: '5:20–5:40 /km',
    vibeTag: 'LONG_RUN',
    meetingPoint: SPOTS.magereBrug,
    maxParticipants: 15,
    status: 'OPEN',
    description:
      'Out along the Amstel to Ouderkerk and back. Water stop at the bridge at 14 km. Marathon-block pace, steady the whole way.',
    participantIds: [user(1), user(3), user(9), user(7), user(4), user(8)],
  },
  {
    id: slot(11),
    hostId: user(5),
    dayOffset: 1,
    title: 'Coffee Ride to Haarlem',
    sportType: 'CYCLING',
    startTime: '09:00',
    endTime: '13:00',
    distanceKm: 80,
    targetPace: '26–28 km/h',
    vibeTag: 'ZONE_2_COFFEE',
    meetingPoint: SPOTS.westerpark,
    maxParticipants: 12,
    status: 'OPEN',
    description:
      "Flat and steady through Spaarnwoude, coffee at the Grote Markt in Haarlem. Train back is fine if you're done.",
    participantIds: [user(2), user(10), user(7)],
  },
  {
    id: slot(12),
    hostId: user(10),
    dayOffset: 1,
    title: 'Tuesday Track Club',
    sportType: 'TRACK',
    startTime: '19:00',
    endTime: null,
    distanceKm: 8,
    targetPace: '3×(4×300m) @ 5K pace',
    vibeTag: 'INTERVALS',
    meetingPoint: SPOTS.olympicTrack,
    maxParticipants: 20,
    status: 'OPEN',
    description: "Weekly club session with a coach on site. Spikes optional, a watch isn't.",
    participantIds: [user(4), user(9)],
  },
  // ── Later this week ────────────────────────────────────────────────────
  {
    id: slot(13),
    hostId: user(4),
    dayOffset: 2,
    title: 'Dyke Hill Repeats',
    sportType: 'RUN',
    startTime: '06:15',
    endTime: '07:15',
    distanceKm: 9,
    targetPace: 'Hard up, jog down',
    vibeTag: 'INTERVALS',
    meetingPoint: SPOTS.ferryNoord,
    maxParticipants: 8,
    status: 'OPEN',
    description:
      'The closest thing Amsterdam has to a hill: 10 × the dyke on the Noord side. Short and sharp.',
    participantIds: [user(6)],
  },
  {
    id: slot(14),
    hostId: user(5),
    dayOffset: 2,
    title: 'Gravel & Burgers',
    sportType: 'GRAVEL',
    startTime: '18:30',
    endTime: '20:30',
    distanceKm: 45,
    targetPace: '22–24 km/h',
    vibeTag: 'SOCIAL_CHAT',
    meetingPoint: SPOTS.sloterplas,
    maxParticipants: 8,
    status: 'CANCELLED',
    description: "Called off: forecast is 50 km/h gusts. We'll pick a new date next week.",
    participantIds: [user(2), user(7)],
  },
  {
    id: slot(15),
    hostId: user(3),
    dayOffset: 5,
    title: 'Saturday Social 12K + Brunch',
    sportType: 'RUN',
    startTime: '09:30',
    endTime: '10:45',
    distanceKm: 12,
    targetPace: '5:45–6:15 /km',
    vibeTag: 'ZONE_2_COFFEE',
    meetingPoint: SPOTS.vondelpark,
    maxParticipants: null,
    status: 'OPEN',
    description:
      "Easy 12K round Vondelpark and Oud-Zuid. Brunch is booked for 11:00 for whoever's still around.",
    participantIds: [user(1), user(8), user(9), user(6), user(10), user(7), user(2)],
  },
]

export interface MockMessage {
  slotId: string
  senderId: string
  content: string
  /** Posted this many minutes before the data is loaded. */
  minutesAgo: number
}

export const MOCK_MESSAGES: MockMessage[] = [
  {
    slotId: slot(4),
    senderId: user(1),
    content: 'Meeting at the letters, on the side facing the Rijksmuseum.',
    minutesAgo: 190,
  },
  {
    slotId: slot(4),
    senderId: user(3),
    content: 'Can I bring a friend if there is space?',
    minutesAgo: 96,
  },
  {
    slotId: slot(4),
    senderId: user(1),
    content: 'Of course, just ask them to tap join so I know numbers.',
    minutesAgo: 91,
  },
  {
    slotId: slot(4),
    senderId: user(6),
    content: 'Running over from Oost, might be 2 min late',
    minutesAgo: 14,
  },
  {
    slotId: slot(6),
    senderId: user(2),
    content: 'Forecast says dry. Bring lights, we will be back after sunset.',
    minutesAgo: 240,
  },
  {
    slotId: slot(6),
    senderId: user(5),
    content: 'I will peel off at Ouderkerk, need to be home by 19:30',
    minutesAgo: 75,
  },
  {
    slotId: slot(6),
    senderId: user(10),
    content: 'Same here, see you at the bridge',
    minutesAgo: 70,
  },
  {
    slotId: slot(7),
    senderId: user(3),
    content: 'First time hosting this one, everyone welcome!',
    minutesAgo: 300,
  },
  { slotId: slot(7), senderId: user(8), content: 'See you there', minutesAgo: 41 },
  {
    slotId: slot(10),
    senderId: user(6),
    content: 'I will leave a crate of bottles at the bridge for the 14 km stop.',
    minutesAgo: 600,
  },
  {
    slotId: slot(10),
    senderId: user(1),
    content: 'Legend. Doing this as my last long one before Rotterdam.',
    minutesAgo: 540,
  },
  {
    slotId: slot(3),
    senderId: user(10),
    content: 'Lane 1 for 1:20s, lane 3 for 1:30s. Bring water, the fountain is broken.',
    minutesAgo: 1300,
  },
]

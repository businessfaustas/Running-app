import type { Profile, SlotStatus, SportType, VibeTag } from './domain'

/**
 * Sample data used by the web app's preview mode and by the API seed script: Vilnius athletes,
 * workouts and chats. Workouts are anchored to a day offset so "today" is always busy.
 */

export const MOCK_CITY_CENTER = { name: 'Vilnius', lat: 54.6872, lng: 25.2797 } as const

const user = (n: number) => `a0000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
const slot = (n: number) => `b0000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
/** Placeholder portraits from randomuser.me for the sample athletes. */
const portrait = (path: string) => `https://randomuser.me/api/portraits/${path}.jpg`

export const MOCK_USERS: Profile[] = [
  {
    id: user(1),
    name: 'Gabija Kazlauskaitė',
    avatarUrl: portrait('women/44'),
    bio: 'Ruošiuosi maratonui ir vejuosi 3:30. Bėgu už avižinį kapučino.',
    sports: ['running', 'cycling'],
    defaultPaces: { running_easy: '5:30/km', cycling_avg: '27 km/h' },
    stravaId: null,
    onboarded: true,
  },
  {
    id: user(2),
    name: 'Lukas Jankauskas',
    avatarUrl: portrait('men/32'),
    bio: 'Plento dviratis. Sekmadieniais kavos išvykos, antradieniais greiti ratai.',
    sports: ['cycling'],
    defaultPaces: { cycling_avg: '31 km/h' },
    stravaId: null,
    onboarded: true,
  },
  {
    id: user(3),
    name: 'Ieva Stankevičiūtė',
    avatarUrl: portrait('women/68'),
    bio: 'Takai ir asfaltas. Visada už ilgą bėgimą su pokalbiais.',
    sports: ['running'],
    defaultPaces: { running_easy: '5:45/km', running_tempo: '4:50/km' },
    stravaId: null,
    onboarded: true,
  },
  {
    id: user(4),
    name: 'Mantas Vasiliauskas',
    avatarUrl: portrait('men/45'),
    bio: '800 m stadione, 10 km plente.',
    sports: ['running'],
    defaultPaces: { running_easy: '5:00/km', running_tempo: '4:05/km' },
    stravaId: null,
    onboarded: true,
  },
  {
    id: user(5),
    name: 'Rūta Žukauskaitė',
    avatarUrl: portrait('women/65'),
    bio: 'Gravel priklausomybė. Jei yra žvyrkelis, aš ten.',
    sports: ['cycling'],
    defaultPaces: { gravel_avg: '24 km/h', cycling_avg: '29 km/h' },
    stravaId: null,
    onboarded: true,
  },
  {
    id: user(6),
    name: 'Dovydas Paulauskas',
    avatarUrl: portrait('men/22'),
    bio: 'Ruošiuosi pirmam ultramaratonui.',
    sports: ['running'],
    defaultPaces: { running_easy: '5:40/km' },
    stravaId: null,
    onboarded: true,
  },
  {
    id: user(7),
    name: 'Eglė Butkutė',
    avatarUrl: portrait('women/12'),
    bio: 'Duatlonas: bėgimas, dviratis, bėgimas, kava.',
    sports: ['running', 'cycling'],
    defaultPaces: { running_easy: '5:20/km', cycling_avg: '30 km/h' },
    stravaId: null,
    onboarded: true,
  },
  {
    id: user(8),
    name: 'Karolis Urbonas',
    avatarUrl: portrait('men/75'),
    bio: 'Bėgu per pietų pertrauką, savaitgaliais – parkrun.',
    sports: ['running'],
    defaultPaces: { running_easy: '5:50/km' },
    stravaId: null,
    onboarded: true,
  },
  {
    id: user(9),
    name: 'Austėja Rimkutė',
    avatarUrl: portrait('women/90'),
    bio: 'Grįžtu po traumos, kol kas tik lengvi kilometrai.',
    sports: ['running'],
    defaultPaces: { running_easy: '6:10/km' },
    stravaId: null,
    onboarded: true,
  },
  {
    id: user(10),
    name: 'Tomas Navickas',
    avatarUrl: portrait('men/86'),
    bio: 'Stadiono fanatikas ir tempo vedlys.',
    sports: ['running', 'cycling'],
    defaultPaces: { running_easy: '4:55/km', cycling_avg: '28 km/h' },
    stravaId: null,
    onboarded: true,
  },
]

const SPOTS = {
  vingisStage: { name: 'Vingio parkas · prie estrados', lat: 54.6836, lng: 25.2386 },
  vingisGate: { name: 'Vingio parkas · pagrindinis įėjimas', lat: 54.6869, lng: 25.2468 },
  cathedral: { name: 'Katedros aikštė · prie varpinės', lat: 54.6858, lng: 25.2877 },
  whiteBridge: { name: 'Baltasis tiltas', lat: 54.6943, lng: 25.2737 },
  lukiskes: { name: 'Lukiškių aikštė', lat: 54.6898, lng: 25.2703 },
  bernardine: { name: 'Bernardinų sodas', lat: 54.6837, lng: 25.2954 },
  uzupis: { name: 'Užupio angelas', lat: 54.6806, lng: 25.2966 },
  leuStadium: { name: 'LEU stadionas', lat: 54.7058, lng: 25.269 },
  puckoriai: { name: 'Pūčkorių atodanga', lat: 54.682, lng: 25.344 },
  valakampiai: { name: 'Valakampių paplūdimys', lat: 54.727, lng: 25.326 },
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
  // ── Šiandien ───────────────────────────────────────────────────────────
  {
    id: slot(1),
    hostId: user(4),
    dayOffset: 0,
    title: 'Saulėtekio tempo 10 km',
    sportType: 'RUN',
    startTime: '06:00',
    endTime: '07:00',
    distanceKm: 10,
    targetPace: '4:30–4:45 /km',
    vibeTag: 'PACE_PUSH',
    meetingPoint: SPOTS.vingisStage,
    maxParticipants: 8,
    status: 'OPEN',
    description:
      '3 km apšilimas, 5 km tempu, tada ramus ratas. Startuojam laiku, tad atvyk kelias minutes anksčiau.',
    participantIds: [user(3), user(6), user(8)],
  },
  {
    id: slot(2),
    hostId: user(5),
    dayOffset: 0,
    title: 'Gravel ratas per Pavilnius',
    sportType: 'GRAVEL',
    startTime: '06:30',
    endTime: '09:30',
    distanceKm: 62,
    targetPace: '24–26 km/h',
    vibeTag: 'SOCIAL_CHAT',
    meetingPoint: SPOTS.uzupis,
    maxParticipants: 6,
    status: 'OPEN',
    description:
      'Užupis → Pavilniai → Pūčkoriai ir atgal miško keliukais. Padangos nuo 35 mm. Kiekviename posūkyje susilaukiam.',
    participantIds: [user(2)],
  },
  {
    id: slot(3),
    hostId: user(10),
    dayOffset: 0,
    title: 'Stadionas: 8 × 400 m',
    sportType: 'TRACK',
    startTime: '07:15',
    endTime: '08:15',
    distanceKm: 7,
    targetPace: '1:25 per 400 m',
    vibeTag: 'INTERVALS',
    meetingPoint: SPOTS.leuStadium,
    maxParticipants: 10,
    status: 'OPEN',
    description:
      '8 × 400 m su 200 m risnele tarp jų. Tinka visiems, išsiskirstom takais pagal tempą.',
    participantIds: [user(9), user(7), user(1), user(4)],
  },
  {
    id: slot(4),
    hostId: user(1),
    dayOffset: 0,
    title: '15 km lengvai + kava',
    sportType: 'RUN',
    startTime: '10:00',
    endTime: '11:30',
    distanceKm: 15,
    targetPace: '5:15–5:30 /km',
    vibeTag: 'ZONE_2_COFFEE',
    meetingPoint: SPOTS.cathedral,
    maxParticipants: 6,
    status: 'OPEN',
    description:
      'Niekas neatsilieka. Neries krantine iki Baltojo tilto, ratas per Vingį ir atgal. Po to kava Pilies gatvėje.',
    participantIds: [user(3), user(6)],
  },
  {
    id: slot(5),
    hostId: user(8),
    dayOffset: 0,
    title: 'Pietų pertraukos prasibėgimas',
    sportType: 'RUN',
    startTime: '12:15',
    endTime: '13:00',
    distanceKm: 7,
    targetPace: '5:45 /km',
    vibeTag: 'SOCIAL_CHAT',
    meetingPoint: SPOTS.lukiskes,
    maxParticipants: null,
    status: 'OPEN',
    description: 'Ratas palei Nerį ir atgal. 13:05 jau sėdėsi prie stalo.',
    participantIds: [user(9), user(10), user(3), user(7)],
  },
  {
    id: slot(6),
    hostId: user(2),
    dayOffset: 0,
    title: 'Vakaro plentas: Trakų ratas',
    sportType: 'CYCLING',
    startTime: '17:30',
    endTime: '20:00',
    distanceKm: 70,
    targetPace: '30–32 km/h',
    vibeTag: 'PACE_PUSH',
    meetingPoint: SPOTS.vingisGate,
    maxParticipants: 6,
    status: 'FULL',
    description:
      'Per Grigiškes iki Trakų ir atgal. Važiuojam greitai, bet ant kalnelių susilaukiam. Žibintai privalomi.',
    participantIds: [user(5), user(7), user(10), user(4), user(1)],
  },
  {
    id: slot(7),
    hostId: user(3),
    dayOffset: 0,
    title: 'Bėgimas palei Nerį',
    sportType: 'RUN',
    startTime: '18:00',
    endTime: '19:00',
    distanceKm: 10,
    targetPace: '5:30–6:00 /km',
    vibeTag: 'SOCIAL_CHAT',
    meetingPoint: SPOTS.whiteBridge,
    maxParticipants: 12,
    status: 'OPEN',
    description: 'Ramus ratas krantinėmis. Puikiai tinka, jei grupėje bėgi pirmą kartą.',
    participantIds: [user(8), user(9), user(6)],
  },
  {
    id: slot(8),
    hostId: user(6),
    dayOffset: 0,
    title: 'Slenksčio intervalai Vingyje',
    sportType: 'RUN',
    startTime: '18:30',
    endTime: '19:30',
    distanceKm: 12,
    targetPace: '4:10–4:20 /km',
    vibeTag: 'INTERVALS',
    meetingPoint: SPOTS.vingisStage,
    maxParticipants: 5,
    status: 'OPEN',
    description:
      '4 × 2 km slenksčio tempu, 2 min. lengvai tarp jų. Po 19 val. praverstų žibintuvėlis.',
    participantIds: [],
  },
  {
    id: slot(9),
    hostId: user(7),
    dayOffset: 0,
    title: 'Naktinis lengvas bėgimas',
    sportType: 'RUN',
    startTime: '20:45',
    endTime: '21:30',
    distanceKm: 8,
    targetPace: '6:00 /km',
    vibeTag: 'ZONE_2_COFFEE',
    meetingPoint: SPOTS.bernardine,
    maxParticipants: 4,
    status: 'OPEN',
    description:
      'Du ratai per Bernardinų sodą ir Kalnų parką su žibintuvėliais. Gera dienos pabaiga.',
    participantIds: [user(10)],
  },
  // ── Rytoj ──────────────────────────────────────────────────────────────
  {
    id: slot(10),
    hostId: user(6),
    dayOffset: 1,
    title: 'Ilgasis 28 km: iki Verkių ir atgal',
    sportType: 'RUN',
    startTime: '08:00',
    endTime: '10:45',
    distanceKm: 28,
    targetPace: '5:20–5:40 /km',
    vibeTag: 'LONG_RUN',
    meetingPoint: SPOTS.whiteBridge,
    maxParticipants: 15,
    status: 'OPEN',
    description:
      'Neries krantine iki Verkių ir atgal. Vandens stotelė ties 14 km. Maratono ruošos tempas, tolygiai visą kelią.',
    participantIds: [user(1), user(3), user(9), user(7), user(4), user(8)],
  },
  {
    id: slot(11),
    hostId: user(5),
    dayOffset: 1,
    title: 'Kavos išvyka į Trakus',
    sportType: 'CYCLING',
    startTime: '09:00',
    endTime: '13:00',
    distanceKm: 80,
    targetPace: '26–28 km/h',
    vibeTag: 'ZONE_2_COFFEE',
    meetingPoint: SPOTS.vingisGate,
    maxParticipants: 12,
    status: 'OPEN',
    description: 'Tolygiai iki Trakų, kava su vaizdu į pilį. Atgal galima ir traukiniu.',
    participantIds: [user(2), user(10), user(7)],
  },
  {
    id: slot(12),
    hostId: user(10),
    dayOffset: 1,
    title: 'Stadiono klubas',
    sportType: 'TRACK',
    startTime: '19:00',
    endTime: null,
    distanceKm: 8,
    targetPace: '3×(4×300 m) 5 km tempu',
    vibeTag: 'INTERVALS',
    meetingPoint: SPOTS.leuStadium,
    maxParticipants: 20,
    status: 'OPEN',
    description: 'Savaitinė treniruotė su treneriu. Šipovkės nebūtinos, laikrodis – būtinas.',
    participantIds: [user(4), user(9)],
  },
  // ── Vėliau šią savaitę ─────────────────────────────────────────────────
  {
    id: slot(13),
    hostId: user(4),
    dayOffset: 2,
    title: 'Kalnelių kartojimai Pūčkoriuose',
    sportType: 'RUN',
    startTime: '06:15',
    endTime: '07:15',
    distanceKm: 9,
    targetPace: 'Į kalną stipriai, žemyn ramiai',
    vibeTag: 'INTERVALS',
    meetingPoint: SPOTS.puckoriai,
    maxParticipants: 8,
    status: 'OPEN',
    description: '10 × įkalnė prie Pūčkorių atodangos. Trumpai ir aštriai.',
    participantIds: [user(6)],
  },
  {
    id: slot(14),
    hostId: user(5),
    dayOffset: 2,
    title: 'Gravel ir mėsainiai',
    sportType: 'GRAVEL',
    startTime: '18:30',
    endTime: '20:30',
    distanceKm: 45,
    targetPace: '22–24 km/h',
    vibeTag: 'SOCIAL_CHAT',
    meetingPoint: SPOTS.valakampiai,
    maxParticipants: 8,
    status: 'CANCELLED',
    description: 'Atšaukta: prognozuojami 50 km/h vėjo gūsiai. Naują datą paskelbsiu kitą savaitę.',
    participantIds: [user(2), user(7)],
  },
  {
    id: slot(15),
    hostId: user(3),
    dayOffset: 5,
    title: 'Ramūs 12 km + pusryčiai',
    sportType: 'RUN',
    startTime: '09:30',
    endTime: '10:45',
    distanceKm: 12,
    targetPace: '5:45–6:15 /km',
    vibeTag: 'ZONE_2_COFFEE',
    meetingPoint: SPOTS.vingisStage,
    maxParticipants: null,
    status: 'OPEN',
    description: 'Lengvai per Vingį ir Žvėryną. 11 val. užsakyti pusryčiai visiems, kas liks.',
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
    content: 'Susitinkam prie varpinės, Katedros aikštėje.',
    minutesAgo: 190,
  },
  {
    slotId: slot(4),
    senderId: user(3),
    content: 'Ar galiu atsivesti draugę, jei bus vietos?',
    minutesAgo: 96,
  },
  {
    slotId: slot(4),
    senderId: user(1),
    content: 'Žinoma! Tik tegul paspaudžia „Dalyvauju“, kad žinočiau, kiek mūsų bus.',
    minutesAgo: 91,
  },
  {
    slotId: slot(4),
    senderId: user(6),
    content: 'Bėgu iš Antakalnio, galiu pavėluoti kokias 2 min.',
    minutesAgo: 14,
  },
  {
    slotId: slot(6),
    senderId: user(2),
    content: 'Prognozė sausa. Pasiimkit žibintus, grįšim jau sutemus.',
    minutesAgo: 240,
  },
  {
    slotId: slot(6),
    senderId: user(5),
    content: 'Aš pasuksiu atgal ties Lentvariu, 19:30 turiu būti namie.',
    minutesAgo: 75,
  },
  {
    slotId: slot(6),
    senderId: user(10),
    content: 'Aš irgi. Iki prie Vingio vartų!',
    minutesAgo: 70,
  },
  {
    slotId: slot(7),
    senderId: user(3),
    content: 'Šitą organizuoju pirmą kartą – visi laukiami!',
    minutesAgo: 300,
  },
  { slotId: slot(7), senderId: user(8), content: 'Iki pasimatymo!', minutesAgo: 41 },
  {
    slotId: slot(10),
    senderId: user(6),
    content: 'Ties 14 km paliksiu dėžę vandens butelių.',
    minutesAgo: 600,
  },
  {
    slotId: slot(10),
    senderId: user(1),
    content: 'Legenda. Tai mano paskutinis ilgasis prieš maratoną.',
    minutesAgo: 540,
  },
  {
    slotId: slot(3),
    senderId: user(10),
    content: '1 takas – ratai po 1:20, 3 takas – po 1:30. Pasiimkit vandens, fontanėlis neveikia.',
    minutesAgo: 1300,
  },
]

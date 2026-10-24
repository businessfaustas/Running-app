import type { Race, RaceAttendee, RacePost, RacePostTopic } from '@pacemates/shared'
import { raceBySlug } from '@pacemates/shared/races'
import clsx from 'clsx'
import {
  ArrowUp,
  CalendarDays,
  Check,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  MapPin,
  MessageCircle,
  Mountain,
  Navigation,
  Reply,
  Route,
  Trash2,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { Avatar, AvatarStack } from '../../components/Avatar'
import { Button, ButtonLink } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LazyLocationMap } from '../../components/maps/LazyLocationMap'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import {
  useCreateRacePost,
  useDeleteRacePost,
  useRaceAttendees,
  useRaceCounts,
  useRacePosts,
  useSetRaceAttendance,
} from '../../data/hooks'
import { track } from '../../lib/analytics'
import { countOf, firstName, formatKm, messageTime, WORDS } from '../../lib/format'
import { toast, toastError } from '../../lib/toast'
import { countdown, raceWhen, todayISO } from './dates'
import { fuelingPath, gearFor } from './gear'
import { RACE_TYPE_META, SURFACE_LABEL, TOPIC_META, TOPIC_ORDER } from './meta'
import { racePhoto } from './photo'

type Tab = 'forum' | 'prep'

const PLACEHOLDERS: Record<RacePostTopic, string> = {
  TIP: 'Pasidalyk patarimu apie trasą ar tempą…',
  QUESTION: 'Ko norėtum paklausti kitų dalyvių?',
  GEAR: 'Kokius batus, liemenę ar aprangą rinktis?',
  LOGISTICS: 'Transportas, nakvynė, numerio atsiėmimas…',
  GENERAL: 'Parašyk kitiems dalyviams…',
}

/** "Neringa (Nida – Smiltynė), Klaipėdos apskr." – the region without repeating the town. */
const place = (race: Race) =>
  [race.city, ...race.region.split(', ').filter((part) => !race.city.includes(part))].join(', ')

const signInPath = (next: string) => `/signin?next=${encodeURIComponent(next)}`

export function RacePage() {
  const { slug = '' } = useParams()
  const race = raceBySlug(slug)
  if (!race) {
    return (
      <div className="flex h-full flex-col">
        <TopBar fallback="/races" title="Varžybos" />
        <EmptyState
          Icon={Trophy}
          title="Varžybų neradome"
          action={<ButtonLink to="/races">Visos varžybos</ButtonLink>}
        >
          Gal nuoroda pasenusi? Peržiūrėk kalendorių – ten rasi visas Lietuvos varžybas.
        </EmptyState>
      </div>
    )
  }
  return <RaceView key={race.slug} race={race} />
}

function RaceView({ race }: { race: Race }) {
  const session = useSession()
  const attendees = useRaceAttendees(race.slug)
  const me = attendees.data?.find((a) => a.id === session?.userId)
  const [tab, setTab] = useState<Tab>('forum')
  const [composeTopic, setComposeTopic] = useState<RacePostTopic>('QUESTION')
  // The course shown in the packing list: picked here, else the one signed up for.
  const [pickedDistance, setDistance] = useState<number | null>(null)
  const distance = pickedDistance ?? me?.distanceKm ?? race.distances[0] ?? 10
  const meta = RACE_TYPE_META[race.type]
  const when = raceWhen(race, todayISO())
  const soon = countdown(when.daysUntil)

  const askAboutGear = () => {
    setComposeTopic('GEAR')
    setTab('forum')
  }

  return (
    <div className="h-full overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <section className="relative flex min-h-[380px] flex-col justify-end overflow-hidden bg-black">
        <img
          src={racePhoto(race)}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/75" />
        <TopBar overlay fallback="/races" />
        <div className="relative px-5 pt-24 pb-12">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider text-black uppercase"
            style={{ backgroundColor: meta.accent }}
          >
            <meta.Icon className="size-3.5" aria-hidden />
            {meta.label}
          </span>
          <h1 className="headline mt-2 text-[40px] text-white">{race.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-white/85">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {when.label}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden />
              {place(race)}
            </span>
            {soon && (
              <span className="rounded-full bg-volt px-2 py-0.5 text-[12px] font-bold text-black">
                {soon}
              </span>
            )}
          </p>
          {!when.confirmed && (
            <p className="mt-2 text-[12px] text-white/60">
              Tiksli data dar nepaskelbta
              {when.lastDate ? ` · paskutinį kartą vyko ${when.lastDate.replaceAll('-', '.')}` : ''}
            </p>
          )}
        </div>
      </section>

      <div className="relative -mt-7 space-y-5 rounded-t-[32px] bg-ink px-5 pt-6">
        <div className="grid grid-cols-2 gap-2.5">
          <Fact Icon={Route} label="Distancijos">
            {race.distances.map(formatKm).join(' / ')} km
          </Fact>
          <Fact Icon={Mountain} label="Aukščio suma">
            {race.elevationGainM ? `+${race.elevationGainM} m` : 'Nenurodyta'}
          </Fact>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {race.surface.map((surface) => (
            <span
              key={surface}
              className="rounded-full bg-raised px-3 py-1 text-[12px] font-bold text-slate-300"
            >
              {SURFACE_LABEL[surface]}
            </span>
          ))}
        </div>

        <p className="text-[15px] leading-relaxed text-slate-300">{race.description}</p>

        <div className="flex flex-wrap gap-2">
          {race.website && (
            <a
              href={race.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-[13px] font-bold text-black transition active:scale-95"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Oficiali svetainė
            </a>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${race.start.lat},${race.start.lng}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-raised px-5 py-2 text-[13px] font-bold text-white transition active:scale-95"
          >
            <Navigation className="size-3.5" aria-hidden />
            Kaip nuvykti
          </a>
        </div>

        <Attendance race={race} attendees={attendees.data} me={me} loading={attendees.isPending} />

        <div
          role="tablist"
          aria-label="Skiltys"
          className="grid grid-cols-2 rounded-full bg-surface p-1"
        >
          {(
            [
              ['forum', 'Forumas', MessageCircle],
              ['prep', 'Pasiruošimas', Check],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={clsx(
                'flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-bold transition-colors',
                tab === id ? 'bg-white text-black' : 'text-slate-400 hover:text-white',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {tab === 'forum' ? (
          <Forum
            race={race}
            attendees={attendees.data ?? []}
            topic={composeTopic}
            onTopicChange={setComposeTopic}
          />
        ) : (
          <Preparation
            race={race}
            distance={distance}
            onDistanceChange={setDistance}
            onAskAboutGear={askAboutGear}
          />
        )}
      </div>
    </div>
  )
}

function Fact({
  Icon,
  label,
  children,
}: {
  Icon: typeof Route
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[20px] bg-surface p-3.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
        <Icon className="size-3.5 text-volt" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-[17px] font-bold text-white tabular">{children}</p>
    </div>
  )
}

// ─── Who's going ─────────────────────────────────────────────────────────────

function Attendance({
  race,
  attendees,
  me,
  loading,
}: {
  race: Race
  attendees: RaceAttendee[] | undefined
  me: RaceAttendee | undefined
  loading: boolean
}) {
  const session = useSession()
  const location = useLocation()
  const save = useSetRaceAttendance(race.slug)
  const [picking, setPicking] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const list = useMemo(() => attendees ?? [], [attendees])
  const others = list.filter((a) => a.id !== session?.userId)
  // Names are for signed-in runners; visitors only get the head-count.
  const counts = useRaceCounts()
  const headCount = session ? list.length : (counts.data?.[race.slug] ?? 0)
  const choices = race.distances.length > 1

  const perDistance = useMemo(() => {
    const counts = new Map<number, number>()
    for (const a of list)
      if (a.distanceKm) counts.set(a.distanceKm, (counts.get(a.distanceKm) ?? 0) + 1)
    return counts
  }, [list])

  const choose = (distanceKm: number | null) => {
    const joining = !me
    save.mutate(
      { distanceKm },
      {
        onSuccess: () => {
          setPicking(false)
          if (joining) {
            track('race_joined', { race: race.slug })
            toast('Puiku! Dabar matysi kitus dalyvius ir jų patarimus.')
          }
        },
        onError: toastError,
      },
    )
  }

  const leave = () =>
    save.mutate(null, {
      onSuccess: () => {
        setConfirmLeave(false)
        track('race_left', { race: race.slug })
      },
      onError: toastError,
    })

  const names = others.slice(0, 2).map((a) => firstName(a.name))
  const summary = !session
    ? headCount === 0
      ? 'Dar niekas iš PaceMates nepažymėjo, kad dalyvaus.'
      : 'Prisijunk, kad matytum, kas dalyvauja.'
    : others.length === 0
      ? me
        ? 'Kol kas iš PaceMates – tik tu. Pakviesk bėgimo draugus!'
        : 'Dar niekas iš PaceMates nepažymėjo, kad dalyvaus.'
      : others.length <= 2
        ? `${names.join(' ir ')} dalyvauja`
        : `${names.join(', ')} ir dar ${countOf(others.length - 2, WORDS.person)}`

  return (
    <section className="rounded-[24px] border border-white/[0.06] bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="headline text-[21px]">Kas dalyvauja</h2>
          <p className="text-[13px] text-slate-500">
            {loading ? 'Kraunama…' : `${countOf(headCount, WORDS.person)} iš PaceMates`}
          </p>
        </div>
        {others.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="shrink-0 pt-1 text-[13px] font-bold text-volt"
          >
            {showAll ? 'Slėpti' : 'Visi'}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        {loading ? (
          <span className="h-8 w-24 animate-pulse rounded-full bg-raised" />
        ) : others.length > 0 ? (
          <AvatarStack users={others.slice(0, 6)} size={32} />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-slate-400">
            <Users className="size-4" aria-hidden />
          </span>
        )}
        {!loading && (
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-slate-300">{summary}</p>
        )}
      </div>

      {showAll && (
        <ul className="mt-3 divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {list.map((a) => (
            <li key={a.id}>
              <Link to={`/athletes/${a.id}`} className="flex items-center gap-3 py-2.5">
                <Avatar user={a} size={32} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">
                  {a.name}
                  {a.id === session?.userId && <span className="text-slate-500"> (tu)</span>}
                </span>
                {a.distanceKm && (
                  <span className="text-[13px] font-bold text-slate-400 tabular">
                    {formatKm(a.distanceKm)} km
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        {!session ? (
          <ButtonLink to={signInPath(location.pathname)} className="w-full">
            <Trophy className="size-4" aria-hidden />
            Dalyvausiu
          </ButtonLink>
        ) : me ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-[14px] font-bold text-volt">
              <span className="grid size-6 place-items-center rounded-full bg-volt text-black">
                <Check className="size-4" strokeWidth={3} aria-hidden />
              </span>
              Tu dalyvauji{me.distanceKm ? ` · ${formatKm(me.distanceKm)} km` : ''}
            </p>
            {choices && (
              <DistancePicker
                race={race}
                selected={me.distanceKm}
                counts={perDistance}
                busy={save.isPending}
                onPick={choose}
                label="Distancija"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => setConfirmLeave(true)}
            >
              Nebedalyvausiu
            </Button>
          </div>
        ) : picking ? (
          <DistancePicker
            race={race}
            selected={undefined}
            counts={perDistance}
            busy={save.isPending}
            onPick={choose}
            label="Kurią distanciją rinkiesi?"
            allowUnsure
          />
        ) : (
          <Button
            className="w-full"
            loading={save.isPending}
            onClick={() => (choices ? setPicking(true) : choose(race.distances[0] ?? null))}
          >
            <Trophy className="size-4" aria-hidden />
            Dalyvausiu
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title="Nebedalyvausi?"
        confirmLabel="Taip, išbraukti"
        busy={save.isPending}
        onConfirm={leave}
        onClose={() => setConfirmLeave(false)}
      >
        Dingsi iš dalyvių sąrašo. Tavo įrašai forume liks.
      </ConfirmDialog>
    </section>
  )
}

function DistancePicker({
  race,
  selected,
  counts,
  busy,
  onPick,
  label,
  allowUnsure = false,
}: {
  race: Race
  selected: number | null | undefined
  counts: Map<number, number>
  busy: boolean
  onPick: (distanceKm: number | null) => void
  label: string
  allowUnsure?: boolean
}) {
  return (
    <fieldset disabled={busy}>
      <legend className="mb-2 text-[13px] font-medium text-slate-300">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {race.distances.map((km) => (
          <button
            key={km}
            type="button"
            aria-pressed={selected === km}
            onClick={() => onPick(km)}
            className={clsx(
              'h-10 rounded-full px-5 text-[14px] font-bold tabular transition-colors disabled:opacity-60',
              selected === km ? 'bg-volt text-black' : 'bg-raised text-white hover:bg-[#2a2a2e]',
            )}
          >
            {formatKm(km)} km
            {(counts.get(km) ?? 0) > 0 && (
              <span
                className={clsx(
                  'ml-1.5 text-[12px]',
                  selected === km ? 'text-black/60' : 'text-slate-500',
                )}
              >
                {counts.get(km)}
              </span>
            )}
          </button>
        ))}
        {allowUnsure && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="h-10 rounded-full px-5 text-[14px] font-bold text-slate-400 hover:text-white"
          >
            Dar nežinau
          </button>
        )}
      </div>
    </fieldset>
  )
}

// ─── Forum ───────────────────────────────────────────────────────────────────

function Forum({
  race,
  attendees,
  topic,
  onTopicChange,
}: {
  race: Race
  attendees: RaceAttendee[]
  topic: RacePostTopic
  onTopicChange: (topic: RacePostTopic) => void
}) {
  const session = useSession()
  const location = useLocation()
  const posts = useRacePosts(race.slug)
  const [filter, setFilter] = useState<RacePostTopic | 'ALL'>('ALL')
  const going = useMemo(() => new Map(attendees.map((a) => [a.id, a.distanceKm])), [attendees])

  const { threads, replies } = useMemo(() => {
    const all = posts.data ?? []
    const replies = new Map<string, RacePost[]>()
    for (const post of all) {
      if (post.parentId) replies.set(post.parentId, [...(replies.get(post.parentId) ?? []), post])
    }
    for (const list of replies.values()) list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const threads = all
      .filter((p) => !p.parentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return { threads, replies }
  }, [posts.data])

  const topicCounts = useMemo(() => {
    const counts = new Map<RacePostTopic, number>()
    for (const t of threads) counts.set(t.topic, (counts.get(t.topic) ?? 0) + 1)
    return counts
  }, [threads])

  const shown = filter === 'ALL' ? threads : threads.filter((t) => t.topic === filter)

  return (
    <section aria-label="Forumas" className="space-y-4">
      {session ? (
        <Composer
          race={race}
          topic={topic}
          onTopicChange={onTopicChange}
          onPosted={(posted) => setFilter((f) => (f === 'ALL' || f === posted ? f : 'ALL'))}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-[22px] border border-dashed border-white/15 p-4">
          <MessageCircle className="size-6 shrink-0 text-volt" aria-hidden />
          <p className="min-w-0 flex-1 text-[14px] text-slate-300">
            Prisijunk, kad galėtum klausti ir dalintis patarimais su kitais dalyviais.
          </p>
          <ButtonLink to={signInPath(location.pathname)} size="sm" variant="light">
            Prisijungti
          </ButtonLink>
        </div>
      )}

      {threads.length > 0 && (
        <div
          role="group"
          aria-label="Temos"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]"
        >
          {(['ALL', ...TOPIC_ORDER] as const)
            .filter((id) => id === 'ALL' || topicCounts.has(id))
            .map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={clsx(
                  'h-8 shrink-0 rounded-full px-3.5 text-[12px] font-bold whitespace-nowrap transition-colors',
                  filter === id
                    ? 'bg-white text-black'
                    : 'bg-surface text-slate-400 hover:text-white',
                )}
              >
                {id === 'ALL'
                  ? `Visos · ${threads.length}`
                  : `${TOPIC_META[id].label} · ${topicCounts.get(id)}`}
              </button>
            ))}
        </div>
      )}

      {posts.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[22px] bg-surface" />
          ))}
        </div>
      ) : posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState Icon={MessageCircle} title="Pradėk diskusiją">
          Paklausk apie trasą, batus ar transportą – atsakys tie, kurie čia jau bėgo ar ruošiasi
          kartu.
        </EmptyState>
      ) : (
        <ol className="space-y-3">
          {shown.map((post) => (
            <li key={post.id}>
              <Thread post={post} replies={replies.get(post.id) ?? []} race={race} going={going} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function Composer({
  race,
  topic,
  onTopicChange,
  onPosted,
}: {
  race: Race
  topic: RacePostTopic
  onTopicChange: (topic: RacePostTopic) => void
  onPosted: (topic: RacePostTopic) => void
}) {
  const create = useCreateRacePost(race.slug)
  const [draft, setDraft] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || create.isPending) return
    create.mutate(
      { topic, content, parentId: null },
      {
        onSuccess: () => {
          setDraft('')
          onPosted(topic)
          track('race_post_created', { race: race.slug, topic })
        },
        onError: toastError,
      },
    )
  }

  return (
    <form onSubmit={submit} className="rounded-[22px] border border-white/[0.06] bg-surface p-3">
      <div role="group" aria-label="Tema" className="flex flex-wrap gap-1.5">
        {TOPIC_ORDER.map((id) => {
          const { label, Icon, tone } = TOPIC_META[id]
          return (
            <button
              key={id}
              type="button"
              aria-pressed={topic === id}
              onClick={() => onTopicChange(id)}
              className={clsx(
                'flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-bold transition-colors',
                topic === id ? tone : 'bg-raised text-slate-400 hover:text-white',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          )
        })}
      </div>
      <AutoTextArea
        id="race-post"
        label="Įrašas"
        value={draft}
        onChange={setDraft}
        placeholder={PLACEHOLDERS[topic]}
        className="mt-3"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[12px] text-slate-600 tabular">
          {draft.length > 1800 ? `${draft.length}/2000` : ''}
        </span>
        <Button type="submit" size="sm" loading={create.isPending} disabled={!draft.trim()}>
          Skelbti
        </Button>
      </div>
    </form>
  )
}

function AutoTextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
  rows = 2,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  autoFocus?: boolean
  rows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // Grow with the text, up to a few lines.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={2000}
        autoFocus={autoFocus}
        className={clsx(
          'block w-full resize-none rounded-[16px] border border-white/10 bg-raised px-3.5 py-2.5 text-[15px] text-white placeholder:text-slate-500 focus:border-blue focus:outline-none',
          className,
        )}
      />
    </>
  )
}

function Thread({
  post,
  replies,
  race,
  going,
}: {
  post: RacePost
  replies: RacePost[]
  race: Race
  going: Map<string, number | null>
}) {
  const session = useSession()
  const create = useCreateRacePost(race.slug)
  const [replying, setReplying] = useState(false)
  const [draft, setDraft] = useState('')
  const { label, Icon, tone } = TOPIC_META[post.topic]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || create.isPending) return
    create.mutate(
      { topic: post.topic, content, parentId: post.id },
      {
        onSuccess: () => {
          setDraft('')
          setReplying(false)
          track('race_post_created', { race: race.slug, topic: post.topic, reply: true })
        },
        onError: toastError,
      },
    )
  }

  return (
    <article className="rounded-[22px] border border-white/[0.06] bg-surface p-3.5">
      <PostBody
        post={post}
        race={race}
        going={going}
        badge={
          <span
            className={clsx(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
              tone,
            )}
          >
            <Icon className="size-3" aria-hidden />
            {label}
          </span>
        }
        replyCount={replies.length}
      />

      {replies.length > 0 && (
        <ol className="mt-3 space-y-3 border-l-2 border-white/10 pl-3">
          {replies.map((reply) => (
            <li key={reply.id}>
              <PostBody post={reply} race={race} going={going} small />
            </li>
          ))}
        </ol>
      )}

      {session &&
        (replying ? (
          <form onSubmit={submit} className="mt-3">
            <AutoTextArea
              id={`reply-${post.id}`}
              label="Atsakymas"
              value={draft}
              onChange={setDraft}
              placeholder="Rašyk atsakymą…"
              rows={1}
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setReplying(false)}>
                Atšaukti
              </Button>
              <Button type="submit" size="sm" loading={create.isPending} disabled={!draft.trim()}>
                <ArrowUp className="size-4" aria-hidden />
                Atsakyti
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-slate-400 hover:text-white"
          >
            <Reply className="size-4" aria-hidden />
            Atsakyti
          </button>
        ))}
    </article>
  )
}

function PostBody({
  post,
  race,
  going,
  badge,
  replyCount = 0,
  small = false,
}: {
  post: RacePost
  race: Race
  going: Map<string, number | null>
  badge?: ReactNode
  replyCount?: number
  small?: boolean
}) {
  const session = useSession()
  const remove = useDeleteRacePost(race.slug)
  const [confirming, setConfirming] = useState(false)
  const mine = post.author.id === session?.userId
  const attending = going.has(post.author.id)
  const distance = going.get(post.author.id)

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <Link to={`/athletes/${post.author.id}`} tabIndex={-1} aria-hidden className="shrink-0">
          <Avatar user={post.author} size={small ? 28 : 36} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 leading-tight">
            <Link
              to={`/athletes/${post.author.id}`}
              className="truncate text-[14px] font-bold text-white"
            >
              {post.author.name}
            </Link>
            <span className="text-[12px] text-slate-500 tabular">
              {messageTime(post.createdAt)}
            </span>
          </p>
          {attending && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-volt">
              <Check className="size-3" strokeWidth={3} aria-hidden />
              Dalyvauja{distance ? ` · ${formatKm(distance)} km` : ''}
            </p>
          )}
        </div>
        {badge}
      </div>
      <p
        className={clsx(
          'mt-2 leading-relaxed break-words whitespace-pre-wrap text-slate-100',
          small ? 'text-[14px]' : 'text-[15px]',
        )}
      >
        {post.content}
      </p>
      {(mine || replyCount > 0) && (
        <div className="mt-1.5 flex items-center gap-3 text-[12px] text-slate-500">
          {replyCount > 0 && <span>{countOf(replyCount, WORDS.reply)}</span>}
          {mine && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1 font-bold hover:text-[#ff7a7a]"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Ištrinti
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title="Ištrinti įrašą?"
        confirmLabel="Ištrinti"
        destructive
        busy={remove.isPending}
        onConfirm={() =>
          remove.mutate(post.id, {
            onSuccess: () => setConfirming(false),
            onError: toastError,
          })
        }
        onClose={() => setConfirming(false)}
      >
        {replyCount > 0
          ? `Kartu dings ir ${countOf(replyCount, WORDS.reply)}.`
          : 'Įrašo atkurti nebus galima.'}
      </ConfirmDialog>
    </div>
  )
}

// ─── Preparation ─────────────────────────────────────────────────────────────

function useTicks(slug: string) {
  const key = `pacemates:gear:${slug}`
  const [ticks, setTicks] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[])
    } catch {
      return new Set()
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...ticks]))
    } catch {
      // Private mode: ticks last until the page closes.
    }
  }, [key, ticks])
  const toggle = (id: string) =>
    setTicks((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return { ticks, toggle, clear: () => setTicks(new Set()) }
}

function Preparation({
  race,
  distance,
  onDistanceChange,
  onAskAboutGear,
}: {
  race: Race
  distance: number
  onDistanceChange: (km: number) => void
  onAskAboutGear: () => void
}) {
  const groups = useMemo(() => gearFor(race, distance), [race, distance])
  const { ticks, toggle, clear } = useTicks(race.slug)
  const ids = groups.flatMap((g) => g.items.map((i) => i.id))
  const done = ids.filter((id) => ticks.has(id)).length
  const fueling = fuelingPath(race, distance)

  return (
    <section aria-label="Pasiruošimas" className="space-y-4">
      {race.distances.length > 1 && (
        <div role="group" aria-label="Distancija" className="flex flex-wrap gap-2">
          {race.distances.map((km) => (
            <button
              key={km}
              type="button"
              aria-pressed={distance === km}
              onClick={() => onDistanceChange(km)}
              className={clsx(
                'h-9 rounded-full px-5 text-[13px] font-bold tabular transition-colors',
                distance === km
                  ? 'bg-white text-black'
                  : 'bg-surface text-slate-300 hover:text-white',
              )}
            >
              {formatKm(km)} km
            </button>
          ))}
        </div>
      )}

      {fueling && (
        <Link
          to={fueling}
          className="flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-blue to-blue-deep p-4 transition active:scale-[0.99]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-volt text-black">
            <Zap className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-white">
              Mitybos planas {formatKm(distance)} km
            </span>
            <span className="block text-[13px] leading-snug text-white/75">
              Kiek gelių ir kada – pagal tavo svorį, tempą ir pulsą
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-white/70" aria-hidden />
        </Link>
      )}

      <div className="rounded-[24px] border border-white/[0.06] bg-surface p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="headline text-[21px]">Ką pasiimti</h2>
            <p className="text-[13px] text-slate-400">
              {done === ids.length
                ? 'Viskas sukrauta – sėkmės starte!'
                : `Paruošta ${done} iš ${ids.length}`}
            </p>
          </div>
          {done > 0 && (
            <button
              type="button"
              onClick={clear}
              className="pb-1 text-[12px] font-bold text-slate-500 hover:text-white"
            >
              Iš naujo
            </button>
          )}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-volt transition-[width] duration-300"
            style={{ width: `${ids.length ? (done / ids.length) * 100 : 0}%` }}
          />
        </div>

        {groups.map((group) => (
          <div key={group.title} className="mt-5">
            <h3 className="text-[12px] font-bold tracking-wider text-slate-500 uppercase">
              {group.title}
            </h3>
            <ul className="mt-1.5">
              {group.items.map((item) => {
                const checked = ticks.has(item.id)
                return (
                  <li key={item.id}>
                    <label className="relative flex cursor-pointer items-start gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item.id)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className={clsx(
                          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-volt',
                          checked ? 'border-volt bg-volt text-black' : 'border-slate-600',
                        )}
                      >
                        {checked && <Check className="size-3.5" strokeWidth={3.5} />}
                      </span>
                      <span
                        className={clsx(
                          'text-[14px] leading-snug transition-colors',
                          checked ? 'text-slate-500 line-through' : 'text-slate-100',
                        )}
                      >
                        {item.text}
                        {item.essential && !checked && (
                          <span className="ml-1.5 rounded-full bg-blaze/15 px-1.5 py-px text-[10px] font-bold tracking-wide text-[#ff9466] uppercase">
                            Būtina
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <button
          type="button"
          onClick={onAskAboutGear}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-raised py-2.5 text-[13px] font-bold text-white hover:bg-[#2a2a2e]"
        >
          <MessageCircle className="size-4" aria-hidden />
          Ko trūksta? Paklausk forume
        </button>
      </div>

      {race.tips.length > 0 && (
        <div className="rounded-[24px] border border-white/[0.06] bg-surface p-4">
          <h2 className="headline text-[21px]">Apie šią trasą</h2>
          <ul className="mt-2 space-y-3">
            {race.tips.map((tip) => (
              <li key={tip} className="flex gap-2.5 text-[14px] leading-relaxed text-slate-200">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-volt" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-surface">
        <div className="h-40">
          <LazyLocationMap point={race.start} accent={RACE_TYPE_META[race.type].accent} zoom={11} />
        </div>
        <p className="flex items-center gap-2 p-3.5 text-[13px] text-slate-400">
          <MapPin className="size-4 shrink-0 text-volt" aria-hidden />
          Starto vieta – {race.city}. Tikslią vietą ir laiką skelbia organizatoriai.
        </p>
      </div>

      <p className="px-1 text-[12px] leading-relaxed text-slate-600">
        Sąrašas sudarytas pagal trasos tipą, sezoną ir distanciją. Privalomą įrangą visada patikrink
        organizatorių taisyklėse.
      </p>
    </section>
  )
}

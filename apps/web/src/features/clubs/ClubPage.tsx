import type { Club } from '@pacemates/shared'
import { clubBySlug } from '@pacemates/shared/clubs'
import { Clock, ExternalLink, Mail, MapPin, Navigation, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { LazyLocationMap } from '../../components/maps/LazyLocationMap'
import { TopBar } from '../../components/TopBar'
import { CLUB_TYPE_META, clubPhoto } from './meta'

export function ClubPage() {
  const { slug = '' } = useParams()
  const club = clubBySlug(slug)
  if (!club) {
    return (
      <div className="flex h-full flex-col">
        <TopBar fallback="/clubs" title="Klubai" />
        <EmptyState
          Icon={UsersRound}
          title="Klubo neradome"
          action={<ButtonLink to="/clubs">Visi klubai</ButtonLink>}
        >
          Gal nuoroda pasenusi? Visus klubus rasi sąraše.
        </EmptyState>
      </div>
    )
  }
  return <ClubView club={club} />
}

function ClubView({ club }: { club: Club }) {
  const accent = CLUB_TYPE_META[club.types[0] ?? 'RUNNING'].accent
  const links: { href: string; label: string; Icon: typeof ExternalLink }[] = [
    club.website && { href: club.website, label: 'Svetainė', Icon: ExternalLink },
    club.facebook && { href: club.facebook, label: 'Facebook', Icon: ExternalLink },
    club.instagram && { href: club.instagram, label: 'Instagram', Icon: ExternalLink },
    club.strava && { href: club.strava, label: 'Strava', Icon: ExternalLink },
    club.email && { href: `mailto:${club.email}`, label: 'Rašyti laišką', Icon: Mail },
  ].filter((link): link is { href: string; label: string; Icon: typeof ExternalLink } =>
    Boolean(link),
  )

  return (
    <div className="h-full overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <section className="relative flex min-h-[340px] flex-col justify-end overflow-hidden bg-black">
        <img
          src={clubPhoto(club)}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/75" />
        <TopBar overlay fallback="/clubs" />
        <div className="relative px-5 pt-24 pb-12">
          <div className="flex flex-wrap gap-1.5">
            {club.types.map((t) => {
              const meta = CLUB_TYPE_META[t]
              return (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider text-black uppercase"
                  style={{ backgroundColor: meta.accent }}
                >
                  <meta.Icon className="size-3.5" aria-hidden />
                  {meta.label}
                </span>
              )
            })}
          </div>
          <h1 className="headline mt-2 text-[38px] text-white">{club.name}</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-white/85">
            <MapPin className="size-4" aria-hidden />
            {club.city}
            {club.founded && <span className="text-white/60"> · nuo {club.founded} m.</span>}
          </p>
        </div>
      </section>

      <div className="relative -mt-7 space-y-5 rounded-t-[32px] bg-ink px-5 pt-6">
        <p className="text-[15px] leading-relaxed text-slate-300">{club.description}</p>

        {(club.level || club.membership) && (
          <div className="grid grid-cols-2 gap-2.5">
            {club.level && <Fact label="Kam tinka">{club.level}</Fact>}
            {club.membership && <Fact label="Narystė">{club.membership}</Fact>}
          </div>
        )}

        {club.schedule.length > 0 && (
          <section className="rounded-[24px] border border-white/[0.06] bg-surface p-4">
            <h2 className="headline text-[21px]">Treniruotės</h2>
            <ul className="mt-2 space-y-2.5">
              {club.schedule.map((line) => (
                <li key={line} className="flex gap-2.5 text-[14px] leading-snug text-slate-200">
                  <Clock className="mt-0.5 size-4 shrink-0" style={{ color: accent }} aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-surface">
          <div className="h-40">
            <LazyLocationMap point={club.location} accent={accent} zoom={13} />
          </div>
          <div className="flex items-center gap-3 p-3.5">
            <MapPin className="size-5 shrink-0" style={{ color: accent }} aria-hidden />
            <p className="min-w-0 flex-1 text-[14px] leading-snug font-bold text-white">
              {club.meetingPlace ?? club.city}
            </p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${club.location.lat},${club.location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold text-black transition active:scale-95"
            >
              <Navigation className="size-3.5" aria-hidden />
              Maršrutas
            </a>
          </div>
        </section>

        {links.length > 0 && (
          <section>
            <h2 className="headline mb-2.5 text-[24px]">Susisiek</h2>
            <div className="flex flex-wrap gap-2">
              {links.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-raised px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#2a2a2e] active:scale-95"
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </a>
              ))}
            </div>
          </section>
        )}

        <ButtonLink to="/" variant="secondary" className="w-full">
          Rasti grupinę treniruotę
        </ButtonLink>

        <p className="px-1 text-[12px] leading-relaxed text-slate-600">
          Informacija surinkta iš klubo viešų puslapių. Tvarkaraščiai ir kainos keičiasi –
          pasitikrink prieš pirmą treniruotę.
        </p>
      </div>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[20px] bg-surface p-3.5">
      <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-[15px] leading-snug font-bold text-white">{children}</p>
    </div>
  )
}

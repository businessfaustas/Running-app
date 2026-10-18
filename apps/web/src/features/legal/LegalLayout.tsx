import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { TopBar } from '../../components/TopBar'
import { LEGAL_UPDATED, OPERATOR } from '../../content/legal'

/** Shared frame for the privacy policy and terms: readable column, numbered sections. */
export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <TopBar title={title} />
      <article className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-14 text-[15px] leading-relaxed text-slate-300 [&_a]:font-semibold [&_a]:text-volt [&_a]:underline [&_h2]:headline [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-[22px] [&_h2]:text-white [&_li]:mt-1 [&_p]:mt-2 [&_strong]:text-white [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="headline text-[32px] text-white">{title}</h1>
        <p className="!mt-1 text-[13px] text-slate-500">
          Paskutinį kartą atnaujinta {LEGAL_UPDATED}
        </p>
        {children}
        <h2>Kontaktai</h2>
        <p>
          {OPERATOR.name}, įmonės kodas {OPERATOR.code}, {OPERATOR.address}. El. paštas:{' '}
          <strong>{OPERATOR.email}</strong>.
        </p>
        <p className="!mt-8 text-[13px] text-slate-500">
          Taip pat skaityk: <Link to="/privatumas">Privatumo politika</Link> ·{' '}
          <Link to="/salygos">Naudojimosi sąlygos</Link>
        </p>
      </article>
    </div>
  )
}

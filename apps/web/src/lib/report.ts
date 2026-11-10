import { OPERATOR } from '../content/legal'

/*
 * The email way to report content (EU Digital Services Act, Art. 16), offered under the in-app
 * report form (components/ReportLink.tsx). The draft already holds what a valid notice needs:
 * where the content is, why it's a problem, who is reporting, and a good-faith statement.
 * Notices go to OPERATOR.email.
 */
export function reportHref(what: string, path: string, id?: string): string {
  const url = `${window.location.origin}${path}`
  const body = [
    `Pranešu apie: ${what}`,
    `Nuoroda: ${url}`,
    ...(id ? [`Įrašo ID: ${id}`] : []),
    '',
    'Kodėl šis turinys neteisėtas ar pažeidžia taisykles (pvz., įžeidimas, grasinimas, asmens duomenys, autorių teisės):',
    '',
    '',
    'Vardas ir pavardė:',
    '',
    'Patvirtinu, kad šiame pranešime pateikta informacija ir teiginiai yra tikslūs ir išsamūs.',
  ].join('\n')
  return `mailto:${OPERATOR.email}?subject=${encodeURIComponent(
    'Pranešimas apie turinį – PaceMates',
  )}&body=${encodeURIComponent(body)}`
}

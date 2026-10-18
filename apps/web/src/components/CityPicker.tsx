import { CITIES, nearestCity, type City } from '@pacemates/shared'
import clsx from 'clsx'
import { Check, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCity, useSetCity } from '../data/city'
import { toast } from '../lib/toast'

/** Lowercase without diacritics, so "siauliai" finds Šiauliai. */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

interface CitySheetProps {
  open: boolean
  onClose: () => void
  /** Called after a town is picked (the choice is already saved). */
  onPicked?: (city: City) => void
}

/** Bottom sheet listing Lithuanian towns; also finds the nearest one from the device location. */
export function CitySheet({ open, onClose, onPicked }: CitySheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const current = useCity()
  const setCity = useSetCity()
  const [query, setQuery] = useState('')
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const pick = (city: City) => {
    setCity(city.id)
    setQuery('')
    onPicked?.(city)
    onClose()
  }

  const locate = () => {
    if (!navigator.geolocation) {
      toast('Ši naršyklė negali nustatyti tavo vietos', 'error')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        pick(nearestCity({ lat: coords.latitude, lng: coords.longitude }))
      },
      () => {
        setLocating(false)
        toast('Nepavyko nustatyti tavo vietos', 'error')
      },
      { timeout: 10_000, maximumAge: 600_000 },
    )
  }

  const search = fold(query.trim())
  const shown = search ? CITIES.filter((c) => fold(c.name).includes(search)) : CITIES

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="city-sheet-title"
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none bg-transparent p-0 backdrop:bg-black/60 sm:m-auto sm:max-w-sm"
    >
      <div className="flex max-h-[85dvh] flex-col rounded-t-[28px] border border-line bg-surface text-white sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <h2 id="city-sheet-title" className="headline text-[28px]">
            Tavo miestas
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Uždaryti"
            className="grid size-10 place-items-center rounded-full bg-raised text-slate-300 hover:text-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <p className="px-5 text-[13px] text-slate-400">
          Rodysime treniruotes, lyderius ir klubus šalia jo.
        </p>

        <div className="space-y-2.5 px-5 pt-4">
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[14px] font-bold text-black transition active:scale-[0.98] disabled:opacity-60"
          >
            <LocateFixed className={clsx('size-4', locating && 'animate-pulse')} aria-hidden />
            {locating ? 'Ieškome…' : 'Pagal mano vietą'}
          </button>
          <label className="relative block">
            <span className="sr-only">Ieškoti miesto</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ieškoti miesto"
              className="h-12 w-full rounded-full border border-white/10 bg-raised pr-4 pl-11 text-[15px] text-white placeholder:text-slate-500 focus:border-blue focus:outline-none"
            />
          </label>
        </div>

        <ul className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {shown.map((city) => {
            const selected = city.id === current.id
            return (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => pick(city)}
                  aria-pressed={selected}
                  className={clsx(
                    'flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] transition-colors',
                    selected
                      ? 'bg-blue/20 font-bold text-white'
                      : 'text-slate-200 hover:bg-white/5',
                  )}
                >
                  <MapPin
                    className={clsx('size-4 shrink-0', selected ? 'text-volt' : 'text-slate-500')}
                    aria-hidden
                  />
                  <span className="flex-1">{city.name}</span>
                  {selected && <Check className="size-5 text-volt" strokeWidth={3} aria-hidden />}
                </button>
              </li>
            )
          })}
          {shown.length === 0 && (
            <li className="px-3 py-6 text-center text-[13px] text-slate-500">
              Tokio miesto sąraše nėra. Pasirink artimiausią.
            </li>
          )}
        </ul>
      </div>
    </dialog>
  )
}

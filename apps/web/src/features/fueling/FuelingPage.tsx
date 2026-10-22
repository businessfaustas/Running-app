import clsx from 'clsx'
import { Droplets, Flame, Info, Mountain, Timer, Zap } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { TextField } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { formatKm } from '../../lib/format'
import {
  estimateMaxHr,
  formatClockMinutes,
  parsePaceInput,
  planFueling,
  type FuelingInput,
  type FuelingPlan,
  type GutTraining,
  type Sex,
} from './fueling'

const PROFILE_KEY = 'pacemates:fuel-profile'
const DISTANCES = [5, 10, 21.1, 42.2, 50, 100]
const GELS = [20, 25, 30, 40]
const ZONE_LABEL = ['', 'Atsigavimas', 'Lengvas', 'Tempinis', 'Slenkstis', 'Maksimalus']

interface SavedProfile {
  weight: string
  age: string
  sex: Sex
  maxHr: string
  gut: GutTraining
  gel: number
}

function loadProfile(): Partial<SavedProfile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}') as Partial<SavedProfile>
  } catch {
    return {}
  }
}

const num = (text: string) => {
  const value = Number(text.replace(',', '.').trim())
  return text.trim() === '' || !Number.isFinite(value) ? null : value
}

export function FuelingPage() {
  const [params] = useSearchParams()
  const [saved] = useState(loadProfile)
  const raceName = params.get('race')

  const [weight, setWeight] = useState(saved.weight ?? '70')
  const [age, setAge] = useState(saved.age ?? '35')
  const [sex, setSex] = useState<Sex>(saved.sex ?? 'other')
  const [maxHr, setMaxHr] = useState(saved.maxHr ?? '')
  const [distance, setDistance] = useState(params.get('distance') ?? '21.1')
  const [pace, setPace] = useState(params.get('pace') ?? '5:30')
  const [targetHr, setTargetHr] = useState(params.get('hr') ?? '155')
  const [temperature, setTemperature] = useState(params.get('temp') ?? '15')
  const [elevation, setElevation] = useState(params.get('elevation') ?? '0')
  const [gut, setGut] = useState<GutTraining>(saved.gut ?? 'some')
  const [gel, setGel] = useState(saved.gel ?? 25)

  // Remember the body details for next time (on this device only).
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ weight, age, sex, maxHr, gut, gel }))
    } catch {
      // Private mode: fine, just not remembered.
    }
  }, [weight, age, sex, maxHr, gut, gel])

  const values = {
    weight: num(weight),
    age: num(age),
    maxHr: maxHr.trim() ? num(maxHr) : null,
    distance: num(distance),
    pace: parsePaceInput(pace),
    targetHr: num(targetHr),
    temperature: num(temperature),
    elevation: num(elevation),
  }
  const estimatedMax = values.age !== null ? estimateMaxHr(values.age, sex) : null
  const effectiveMax = values.maxHr ?? estimatedMax

  const errors: Record<string, string | null> = {
    weight:
      values.weight === null || values.weight < 30 || values.weight > 200
        ? 'Įvesk svorį nuo 30 iki 200 kg'
        : null,
    age:
      values.age === null || values.age < 12 || values.age > 90
        ? 'Įvesk amžių nuo 12 iki 90 m.'
        : null,
    maxHr:
      maxHr.trim() && (values.maxHr === null || values.maxHr < 120 || values.maxHr > 230)
        ? 'Maks. pulsas paprastai būna 120–230'
        : null,
    distance:
      values.distance === null || values.distance < 1 || values.distance > 250
        ? 'Distancija nuo 1 iki 250 km'
        : null,
    pace:
      values.pace === null || values.pace < 150 || values.pace > 900
        ? 'Rašyk tempą min:sek, pvz., 5:30'
        : null,
    targetHr:
      values.targetHr === null || values.targetHr < 80 || values.targetHr > 220
        ? 'Pulsas nuo 80 iki 220'
        : effectiveMax && values.targetHr > effectiveMax
          ? `Tikslinis pulsas viršija maksimalų (${effectiveMax})`
          : null,
    temperature:
      values.temperature === null || values.temperature < -25 || values.temperature > 45
        ? 'Temperatūra nuo −25 iki 45 °C'
        : null,
    elevation:
      values.elevation === null || values.elevation < 0 || values.elevation > 10000
        ? 'Aukščio suma nuo 0 iki 10 000 m'
        : null,
  }
  const valid = Object.values(errors).every((e) => e === null)

  const plan = valid
    ? planFueling({
        weightKg: values.weight!,
        age: values.age!,
        sex,
        maxHr: values.maxHr,
        distanceKm: values.distance!,
        paceSecPerKm: values.pace!,
        targetHr: values.targetHr!,
        temperatureC: values.temperature!,
        elevationGainM: values.elevation!,
        gutTraining: gut,
        gelCarbsG: gel,
      } satisfies FuelingInput)
    : null

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Mitybos skaičiuoklė" fallback="/races" />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-12">
        <p className="text-[12px] font-bold tracking-[0.14em] text-slate-500 uppercase">
          {raceName ? `Planas: ${raceName}` : 'Angliavandeniai varžyboms'}
        </p>
        <h1 className="headline mt-1 text-[44px]">
          Kuro <span className="text-volt">planas</span>
        </h1>
        <p className="mt-2 text-[14px] text-slate-400">
          Įvesk savo duomenis – apskaičiuosime, kiek angliavandenių, skysčių ir druskų reikės
          trasoje ir kada juos vartoti.
        </p>

        <Card title="Tu">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Svoris"
              inputMode="decimal"
              suffix="kg"
              value={weight}
              error={errors.weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <TextField
              label="Amžius"
              inputMode="numeric"
              suffix="m."
              value={age}
              error={errors.age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <Segmented
            label="Lytis"
            value={sex}
            onChange={setSex}
            options={[
              ['female', 'Moteris'],
              ['male', 'Vyras'],
              ['other', 'Nenurodyti'],
            ]}
          />
          <TextField
            label="Maksimalus pulsas (jei žinai)"
            inputMode="numeric"
            suffix="k./min"
            placeholder={estimatedMax ? String(estimatedMax) : ''}
            value={maxHr}
            error={errors.maxHr}
            hint={
              estimatedMax && !maxHr.trim()
                ? `Neįvedus skaičiuojame pagal amžių: ~${estimatedMax}`
                : undefined
            }
            onChange={(e) => setMaxHr(e.target.value)}
          />
        </Card>

        <Card title="Varžybos">
          <TextField
            label="Distancija"
            inputMode="decimal"
            suffix="km"
            value={distance}
            error={errors.distance}
            onChange={(e) => setDistance(e.target.value)}
          />
          <div className="-mt-1 flex flex-wrap gap-2">
            {DISTANCES.map((km) => (
              <Chip
                key={km}
                selected={num(distance) === km}
                onClick={() => setDistance(String(km))}
              >
                {formatKm(km)} km
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Tempas"
              inputMode="text"
              suffix="/km"
              value={pace}
              error={errors.pace}
              hint={plan ? `Finišas ~${formatClockMinutes(plan.durationMin)}` : undefined}
              onChange={(e) => setPace(e.target.value)}
            />
            <TextField
              label="Aukščio suma"
              inputMode="numeric"
              suffix="m"
              value={elevation}
              error={errors.elevation}
              onChange={(e) => setElevation(e.target.value)}
            />
          </div>
          <TextField
            label="Oro temperatūra"
            inputMode="decimal"
            suffix="°C"
            value={temperature}
            error={errors.temperature}
            onChange={(e) => setTemperature(e.target.value)}
          />
        </Card>

        <Card title="Intensyvumas">
          <TextField
            label="Tikslinis vidutinis pulsas"
            inputMode="numeric"
            suffix="k./min"
            value={targetHr}
            error={errors.targetHr}
            onChange={(e) => setTargetHr(e.target.value)}
          />
          {plan && (
            <p className="-mt-1 flex flex-wrap items-center gap-2 text-[13px] text-slate-400">
              <span className="rounded-full bg-volt px-2.5 py-0.5 text-[12px] font-bold text-black">
                {plan.zone} zona · {ZONE_LABEL[plan.zone]}
              </span>
              {Math.round(plan.hrFraction * 100)} % maks. pulso · ~
              {Math.round(plan.vo2Fraction * 100)} % VO₂max
            </p>
          )}
        </Card>

        <Card title="Skrandis ir geliai">
          <Segmented
            label="Ar treniravai mitybą bėgdamas?"
            value={gut}
            onChange={setGut}
            options={[
              ['none', 'Ne'],
              ['some', 'Kartais'],
              ['trained', 'Reguliariai'],
            ]}
          />
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-300">
              Angliavandenių viename gelyje
            </p>
            <div className="flex flex-wrap gap-2">
              {GELS.map((g) => (
                <Chip key={g} selected={gel === g} onClick={() => setGel(g)}>
                  {g} g
                </Chip>
              ))}
            </div>
          </div>
        </Card>

        {plan ? (
          <Results plan={plan} gel={gel} />
        ) : (
          <p
            role="status"
            className="mt-6 rounded-[22px] bg-blaze/15 px-5 py-3 text-sm font-semibold text-[#ff9466]"
          >
            Pataisyk pažymėtus laukus – rezultatai atsiras čia.
          </p>
        )}
      </div>
    </div>
  )
}

function Results({ plan, gel }: { plan: FuelingPlan; gel: number }) {
  const { intake } = plan
  const hours = plan.durationMin / 60
  return (
    <section aria-live="polite" className="mt-6 space-y-3">
      <div className="relative overflow-hidden rounded-[28px] bg-blue p-5">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-white/10 blur-2xl"
        />
        <p className="relative text-[12px] font-bold tracking-[0.14em] text-white/90 uppercase">
          Trasoje vartok
        </p>
        {intake.level === 'none' ? (
          <>
            <p className="headline relative mt-2 text-[40px] text-white">Nieko papildomo</p>
            <p className="relative mt-1 text-[14px] text-white/85">
              Iki 45 min. užtenka gerų pusryčių ir atsargų raumenyse. Vandens – pagal troškulį.
            </p>
          </>
        ) : (
          <>
            <p className="relative mt-2 font-display text-[64px] leading-none font-bold text-white tabular">
              {intake.perHour}
              <span className="ml-1 text-[22px] text-volt">g/val.</span>
            </p>
            <p className="relative mt-2 text-[14px] text-white/85">
              {intake.level === 'optional'
                ? `Nebūtina, bet padeda: iki ${intake.high} g/val. arba skalauk burną sportiniu gėrimu.`
                : `Rekomenduojamas intervalas ${intake.low}–${intake.high} g/val.`}
              {plan.scheduleTotalG > 0 &&
                ` Iš viso ~${plan.scheduleTotalG} g – ${plan.schedule.length} × ${gel} g gelis.`}
            </p>
          </>
        )}
      </div>

      {plan.schedule.length > 0 && <Timeline plan={plan} />}

      <div className="grid grid-cols-2 gap-2">
        <Stat
          Icon={Flame}
          label="Sudegsi"
          value={`${plan.kcalTotal.toLocaleString('lt-LT')}`}
          unit="kcal"
          sub={`${plan.kcalPerHour} kcal/val.`}
        />
        <Stat
          Icon={Zap}
          label="Angliavandenių"
          value={`${plan.carbBurnTotal}`}
          unit="g"
          sub={`${plan.carbBurnPerHour} g/val. sunaudosi`}
        />
        <Stat
          Icon={Droplets}
          label="Skysčių"
          value={`${plan.fluidsMlPerHour}`}
          unit="ml/val."
          sub={`Natrio ~${plan.sodiumMgPerHour} mg/val.`}
        />
        <Stat
          Icon={Timer}
          label="Trukmė"
          value={formatClockMinutes(plan.durationMin)}
          unit=""
          sub={`${hours.toFixed(1).replace('.', ',')} val. trasoje`}
        />
      </div>

      <div className="rounded-[22px] bg-surface p-4">
        <p className="text-[13px] font-bold text-white">Iš ko gausi energiją</p>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-raised">
          <span className="bg-volt" style={{ width: `${Math.round(plan.carbFraction * 100)}%` }} />
          <span
            className="bg-ice/70"
            style={{ width: `${100 - Math.round(plan.carbFraction * 100)}%` }}
          />
        </div>
        <p className="mt-2 flex justify-between text-[12.5px] text-slate-400">
          <span>
            <span className="font-bold text-volt">{Math.round(plan.carbFraction * 100)} %</span>{' '}
            angliavandeniai
          </span>
          <span>
            <span className="font-bold text-ice">
              {100 - Math.round(plan.carbFraction * 100)} %
            </span>{' '}
            riebalai
          </span>
        </p>
        <p className="mt-3 text-[13px] leading-snug text-slate-400">
          Glikogeno atsargos raumenyse ir kepenyse – apie{' '}
          <strong className="text-white">{plan.glycogenG} g</strong>.{' '}
          {plan.minutesUntilLow !== null ? (
            <>
              Nieko nevalgant šiuo tempu jos ims sekti po ~
              <strong className="text-white">{formatClockMinutes(plan.minutesUntilLow)}</strong>
              {plan.kmUntilLow !== null && ` (apie ${plan.kmUntilLow} km)`} – tai ir yra garsioji
              „siena“.
            </>
          ) : (
            'Šiai distancijai jų užtenka su kaupu.'
          )}
        </p>
      </div>

      <div className="rounded-[22px] bg-surface p-4">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-white">
          <Mountain className="size-4 text-volt" aria-hidden />
          Prieš startą
        </p>
        <ul className="mt-2 space-y-1.5 text-[13.5px] leading-snug text-slate-300">
          <li>
            2–4 val. prieš startą:{' '}
            <strong className="text-white">
              {plan.preRaceMealG[0]}–{plan.preRaceMealG[1]} g
            </strong>{' '}
            angliavandenių (pvz., avižos, bananas, baltos duonos sumuštinis su uogiene).
          </li>
          {plan.carbLoadPerDayG && (
            <li>
              36–48 val. prieš: angliavandenių įkrova – po{' '}
              <strong className="text-white">
                {plan.carbLoadPerDayG[0]}–{plan.carbLoadPerDayG[1]} g
              </strong>{' '}
              per parą (≈10–12 g/kg), mažiau skaidulų ir riebalų.
            </li>
          )}
          <li>Startuok pailsėjęs ir hidratuotas: ~5–7 ml/kg vandens likus 4 val.</li>
        </ul>
      </div>

      <div className="rounded-[22px] bg-surface p-4">
        <p className="text-[13px] font-bold text-white">Patarimai</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13.5px] leading-snug text-slate-300">
          <li>
            Gelį užsigerk keliais gurkšniais vandens, ne izotoniniu gėrimu – kitaip per daug cukraus
            vienu metu.
          </li>
          {plan.intake.perHour >= 60 && (
            <li>
              Daugiau nei 60 g/val. geriausiai pasisavinama vartojant gliukozės ir fruktozės mišinį
              (ieškok „2:1“ ar „1:0,8“ ant pakuotės).
            </li>
          )}
          <li>Viską išbandyk per ilgąsias treniruotes – varžybų dieną jokių naujienų.</li>
          {plan.fluidsMlPerHour >= 600 && (
            <li>
              Karšta – gerk reguliariai, bet ne daugiau nei ~800 ml/val., ir nepamiršk druskų.
            </li>
          )}
        </ul>
      </div>

      <p className="flex gap-2 px-1 text-[12px] leading-snug text-slate-500">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Tai apytikslis įvertinimas pagal sporto mitybos rekomendacijas (Jeukendrup, ACSM), ne
        medicininis patarimas. Jei turi sveikatos sutrikimų (pvz., diabetą), mitybą derink su
        gydytoju ar sporto dietologu.
      </p>
    </section>
  )
}

function Timeline({ plan }: { plan: FuelingPlan }) {
  return (
    <div className="rounded-[22px] bg-surface p-4">
      <p className="text-[13px] font-bold text-white">Kada vartoti</p>
      <div className="relative mt-5 mb-7 h-1.5 rounded-full bg-raised">
        {plan.schedule.map((stop) => (
          <span
            key={stop.minute}
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt ring-4 ring-surface"
            style={{ left: `${(stop.minute / plan.durationMin) * 100}%` }}
          />
        ))}
        <span className="absolute -bottom-6 left-0 text-[11px] font-bold text-slate-500">
          Startas
        </span>
        <span className="absolute right-0 -bottom-6 text-[11px] font-bold text-slate-500">
          Finišas · {formatKm(Math.round(plan.distanceKm * 10) / 10)} km
        </span>
      </div>
      <ol className="divide-y divide-white/[0.06]">
        {plan.schedule.map((stop, i) => (
          <li key={stop.minute} className="flex items-center gap-3 py-2 text-[14px]">
            <span className="w-12 font-display text-[18px] font-bold text-volt tabular">
              {formatClockMinutes(stop.minute)}
            </span>
            <span className="w-16 text-slate-400 tabular">{formatKm(stop.km)} km</span>
            <span className="text-white">
              {i + 1}-as gelis · {stop.grams} g
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 space-y-3.5 rounded-[24px] border border-white/[0.06] bg-surface p-4">
      <h2 className="headline text-[19px]">{title}</h2>
      {children}
    </section>
  )
}

function Stat({
  Icon,
  label,
  value,
  unit,
  sub,
}: {
  Icon: typeof Flame
  label: string
  value: string
  unit: string
  sub: string
}) {
  return (
    <div className="rounded-[20px] bg-surface p-3.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
        <Icon className="size-3.5 text-volt" aria-hidden />
        {label}
      </p>
      <p className="mt-1 font-display text-[26px] leading-none font-bold text-white tabular">
        {value}
        {unit && <span className="ml-1 text-[13px] text-slate-400">{unit}</span>}
      </p>
      <p className="mt-1 text-[12px] text-slate-500">{sub}</p>
    </div>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'h-9 rounded-full px-3.5 text-[13px] font-bold tabular transition-colors',
        selected ? 'bg-white text-black' : 'bg-raised text-slate-300 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: [T, string][]
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-slate-300">{label}</legend>
      <div
        className="grid rounded-full bg-raised p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={clsx(
              'h-9 rounded-full text-[13px] font-bold transition-colors',
              value === id ? 'bg-volt text-black' : 'text-slate-400 hover:text-white',
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

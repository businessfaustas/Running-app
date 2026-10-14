import {
  ChevronRight,
  FileText,
  KeyRound,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { backend } from '../../backend'
import { MESSAGES } from '../../backend/messages'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PasswordChecklist, PasswordField } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { track } from '../../lib/analytics'
import { toast } from '../../lib/toast'
import { confirmPasswordError, passwordChecks, passwordError } from '../../lib/validation'

/** Typed to confirm deleting an account, so it can't happen by a mis-tap. */
const DELETE_WORD = 'IŠTRINTI'

export function SettingsPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'delete' | 'reset' | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  const signOut = async () => {
    await backend.signOut()
    toast('Atsijungei. Iki greito!')
    navigate('/', { replace: true })
  }

  const deleteAccount = async () => {
    setBusy(true)
    try {
      await backend.deleteAccount()
      track('account_deleted')
      setDialog(null)
      toast('Paskyra ir visi jos duomenys ištrinti')
      navigate('/', { replace: true })
    } catch (error) {
      toast(error instanceof Error ? error.message : MESSAGES.unknown, 'error')
    } finally {
      setBusy(false)
    }
  }

  const resetDemo = async () => {
    setBusy(true)
    await backend.resetDemo?.()
    setBusy(false)
    setDialog(null)
    toast('Peržiūros duomenys išvalyti')
    navigate('/', { replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Nustatymai" fallback="/profile" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-10">
        <Group title="Paskyra">
          <div className="px-4 py-3.5">
            <p className="text-[12px] font-semibold text-slate-500">Prisijungta kaip</p>
            <p className="truncate text-[15px] font-bold text-white">
              {session?.email ?? 'Pavyzdinė paskyra'}
            </p>
          </div>
          <Row Icon={UserRound} to="/profile/edit">
            Redaguoti profilį
          </Row>
          <ChangePassword />
        </Group>

        <Group title="Teisinė informacija">
          <Row Icon={ShieldCheck} to="/privatumas">
            Privatumo politika
          </Row>
          <Row Icon={FileText} to="/salygos">
            Naudojimosi sąlygos
          </Row>
        </Group>

        {backend.resetDemo && (
          <Group title="Peržiūros režimas">
            <Row Icon={RotateCcw} onClick={() => setDialog('reset')}>
              Išvalyti šio įrenginio duomenis
            </Row>
          </Group>
        )}

        <Button variant="secondary" size="lg" className="mt-6 w-full" onClick={signOut}>
          <LogOut className="size-4" aria-hidden />
          Atsijungti
        </Button>

        <section className="mt-8 rounded-[24px] border border-blaze/30 p-4">
          <h2 className="headline text-[22px] text-[#ff9466]">Ištrinti paskyrą</h2>
          <p className="mt-1.5 text-[13.5px] leading-snug text-slate-400">
            Visam laikui ištrinsime tavo paskyrą, profilį, organizuojamas treniruotes ir
            žinutes. To atšaukti negalima.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => {
              setTyped('')
              setDialog('delete')
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Ištrinti paskyrą
          </Button>
        </section>

        <p className="mt-8 text-center text-[11.5px] text-slate-600">
          PaceMates · versija {import.meta.env.VITE_APP_VERSION}
          {backend.mode === 'demo' && ' · peržiūros režimas'}
        </p>
      </div>

      <ConfirmDialog
        open={dialog === 'delete'}
        title="Ištrinti paskyrą?"
        confirmLabel="Ištrinti visam laikui"
        destructive
        busy={busy}
        confirmDisabled={typed.trim().toUpperCase() !== DELETE_WORD}
        onClose={() => setDialog(null)}
        onConfirm={deleteAccount}
      >
        <p>
          Bus ištrinta paskyra, profilis, tavo organizuojamos treniruotės (kartu su jų
          pokalbiais) ir tavo žinutės. Atkurti nebus įmanoma.
        </p>
        <label className="mt-4 block text-[13px] font-semibold text-slate-300">
          Patvirtinimui įrašyk <span className="font-bold text-white">{DELETE_WORD}</span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            className="mt-1.5 h-12 w-full rounded-2xl border border-line bg-raised px-4 text-white focus:border-blaze focus:outline-none"
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'reset'}
        title="Išvalyti duomenis?"
        confirmLabel="Išvalyti"
        destructive
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={resetDemo}
      >
        Visos šiame įrenginyje sukurtos paskyros, treniruotės ir žinutės dings, o
        pavyzdiniai duomenys grįš į pradinę būseną.
      </ConfirmDialog>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="mb-2 px-1 text-[12px] font-bold tracking-[0.12em] text-slate-500 uppercase">
        {title}
      </h2>
      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface">
        {children}
      </div>
    </section>
  )
}

function Row({
  Icon,
  to,
  onClick,
  children,
}: {
  Icon: LucideIcon
  to?: string
  onClick?: () => void
  children: ReactNode
}) {
  const content = (
    <>
      <Icon className="size-5 shrink-0 text-slate-400" aria-hidden />
      <span className="min-w-0 flex-1 text-[15px] font-semibold text-white">{children}</span>
      <ChevronRight className="size-5 text-slate-600" aria-hidden />
    </>
  )
  const className =
    'flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.03]'
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const errors = {
    password: passwordError(password),
    confirm: confirmPasswordError(password, confirm),
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)
    if (errors.password || errors.confirm) return
    setBusy(true)
    try {
      await backend.updatePassword(password)
      toast('Slaptažodis pakeistas')
      setOpen(false)
      setPassword('')
      setConfirm('')
      setSubmitted(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : MESSAGES.unknown)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Row Icon={KeyRound} onClick={() => setOpen(true)}>
        Pakeisti slaptažodį
      </Row>
    )
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-3.5 px-4 py-4">
      <p className="text-[15px] font-bold text-white">Naujas slaptažodis</p>
      {formError && (
        <p role="alert" className="rounded-2xl bg-blaze/15 px-3.5 py-2.5 text-sm font-semibold text-[#ff9466]">
          {formError}
        </p>
      )}
      <PasswordField
        label="Naujas slaptažodis"
        autoComplete="new-password"
        maxLength={72}
        value={password}
        error={submitted ? errors.password : null}
        hint={<PasswordChecklist checks={passwordChecks(password)} />}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordField
        label="Pakartok slaptažodį"
        autoComplete="new-password"
        maxLength={72}
        value={confirm}
        error={submitted ? errors.confirm : null}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Atšaukti
        </Button>
        <Button type="submit" className="flex-1" loading={busy}>
          Išsaugoti
        </Button>
      </div>
    </form>
  )
}

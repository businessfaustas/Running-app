import { useEffect, type ReactNode } from 'react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { Button, ButtonLink } from '../../components/Button'
import { Logo } from '../../components/Logo'
import { PHOTOS } from '../../lib/photos'
import { reportError } from '../../lib/monitoring'

function ErrorScreen({
  code,
  title,
  text,
  children,
}: {
  code: string
  title: string
  text: string
  children: ReactNode
}) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-black">
      <img src={PHOTOS.runCoast} alt="" className="absolute inset-0 size-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black" />
      <div className="relative px-5 pt-[calc(env(safe-area-inset-top)+20px)]">
        <Logo className="text-white" size={20} />
      </div>
      <div className="relative mt-auto px-5 pb-[calc(env(safe-area-inset-bottom)+28px)]">
        <p className="headline text-[120px] leading-[0.8] text-volt">{code}</p>
        <h1 className="headline mt-4 text-[44px] text-white">{title}</h1>
        <p className="mt-3 max-w-sm text-[15px] text-white/80">{text}</p>
        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">{children}</div>
      </div>
    </div>
  )
}

/** Custom 404: a path that doesn't exist (or a deleted workout's old link). */
export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <ErrorScreen
      code="404"
      title="Nuklydai nuo trasos"
      text="Tokio puslapio nėra. Gal nuoroda pasenusi arba treniruotė jau ištrinta."
    >
      <ButtonLink to="/" size="lg" className="sm:flex-1">
        Į pradžią
      </ButtonLink>
      <Button
        variant="glass"
        size="lg"
        className="sm:flex-1"
        onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      >
        Atgal
      </Button>
    </ErrorScreen>
  )
}

/** Anything a screen throws while rendering lands here instead of a blank page. */
export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  useEffect(() => {
    if (!notFound) reportError(error, { where: 'route' })
  }, [error, notFound])

  if (notFound) return <NotFoundPage />
  return (
    <ErrorScreen
      code="Oi!"
      title="Kažkas nutiko"
      text="Įvyko netikėta klaida. Pabandyk perkrauti puslapį – dažniausiai to užtenka."
    >
      <Button size="lg" className="sm:flex-1" onClick={() => window.location.reload()}>
        Perkrauti
      </Button>
      <Button
        variant="glass"
        size="lg"
        className="sm:flex-1"
        onClick={() => window.location.assign('/')}
      >
        Į pradžią
      </Button>
    </ErrorScreen>
  )
}

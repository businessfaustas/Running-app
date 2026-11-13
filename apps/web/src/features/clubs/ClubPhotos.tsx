import type { Club, ClubPhoto } from '@pacemates/shared'
import { Camera, ImagePlus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { ReportLink } from '../../components/ReportLink'
import { useSession } from '../../data/auth'
import { useAddClubPhoto, useClubPhotos, useDeleteClubPhoto } from '../../data/hooks'
import { track } from '../../lib/analytics'
import { messageTime } from '../../lib/format'
import { fitPhoto, ImageError } from '../../lib/image'
import { toast, toastError } from '../../lib/toast'

const PREVIEW = 9

/** "Akimirkos": a grid of photos from the club's runs and rides, added by the community. */
export function ClubPhotos({ club }: { club: Club }) {
  const session = useSession()
  const location = useLocation()
  const photos = useClubPhotos(club.slug)
  const add = useAddClubPhoto(club.slug)
  const [open, setOpen] = useState<ClubPhoto | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const list = photos.data ?? []
  const shown = showAll ? list : list.slice(0, PREVIEW)

  const upload = async (file: File) => {
    setPreparing(true)
    try {
      const image = await fitPhoto(file)
      add.mutate(image, {
        onSuccess: () => {
          track('club_photo_added', { club: club.slug })
          toast('Nuotrauka įkelta – ačiū!')
        },
        onError: toastError,
      })
    } catch (error) {
      toastError(
        error instanceof ImageError ? error : new ImageError('Nuotraukos paruošti nepavyko.'),
      )
    } finally {
      setPreparing(false)
    }
  }

  return (
    <section aria-labelledby="club-photos-title">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="club-photos-title" className="headline text-[21px]">
          Akimirkos
        </h2>
        {list.length > PREVIEW && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="text-[13px] font-bold text-volt"
          >
            {showAll ? 'Mažiau' : `Visos (${list.length})`}
          </button>
        )}
      </div>

      {photos.isPending ? (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-square skeleton rounded-[14px] bg-surface" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex items-center gap-3 rounded-[22px] border border-dashed border-white/15 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-raised text-volt">
            <Camera className="size-5" aria-hidden />
          </span>
          <p className="text-[14px] leading-snug text-slate-300">
            Dar nėra nuotraukų. Buvai klubo treniruotėje? Pasidalyk akimirka.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5">
          {shown.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setOpen(photo)}
                className="block aspect-square w-full overflow-hidden rounded-[14px] bg-surface transition active:scale-[0.97]"
              >
                <img
                  src={photo.url}
                  alt={`Akimirka iš ${club.name}, įkėlė ${photo.author.name}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        {session ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              loading={preparing || add.isPending}
              onClick={() => input.current?.click()}
            >
              <ImagePlus className="size-4" aria-hidden />
              Įkelti nuotrauką
            </Button>
            <p className="mt-2 text-[12px] leading-snug text-slate-500">
              Kelk tik savo darytas nuotraukas. Jei jose matyti kitų žmonių, įsitikink, kad jie
              neprieštarauja.
            </p>
            <input
              ref={input}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void upload(file)
              }}
            />
          </>
        ) : (
          <Link
            to={`/signin?next=${encodeURIComponent(location.pathname)}`}
            className="text-[13px] font-bold text-volt"
          >
            Prisijunk ir pasidalyk akimirka
          </Link>
        )}
      </div>

      <PhotoViewer club={club} photo={open} onClose={() => setOpen(null)} />
    </section>
  )
}

function PhotoViewer({
  club,
  photo,
  onClose,
}: {
  club: Club
  photo: ClubPhoto | null
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const session = useSession()
  const remove = useDeleteClubPhoto(club.slug)
  const [confirming, setConfirming] = useState(false)
  const mine = photo !== null && photo.author.id === session?.userId

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (photo && !dialog.open) dialog.showModal()
    if (!photo && dialog.open) dialog.close()
    setConfirming(false)
  }, [photo])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="Nuotrauka"
      className="m-auto w-full max-w-lg bg-transparent p-3 backdrop:bg-black/85"
    >
      {photo && (
        <div className="overflow-hidden rounded-[24px] bg-surface text-white">
          <div className="relative bg-black">
            <img
              src={photo.url}
              alt={`Akimirka iš ${club.name}, įkėlė ${photo.author.name}`}
              className="mx-auto max-h-[68vh] w-full object-contain"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Uždaryti"
              className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-black/60 text-white"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Avatar user={photo.author} size={36} />
            <div className="min-w-0 flex-1">
              <Link
                to={`/athletes/${photo.author.id}`}
                className="block truncate text-[14px] font-bold text-white"
              >
                {photo.author.name}
              </Link>
              <p className="text-[12px] text-slate-500">{messageTime(photo.createdAt)}</p>
            </div>
            {mine ? (
              confirming ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                    Ne
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={remove.isPending}
                    onClick={() =>
                      remove.mutate(photo.id, {
                        onSuccess: () => {
                          toast('Nuotrauka ištrinta')
                          onClose()
                        },
                        onError: toastError,
                      })
                    }
                  >
                    Ištrinti
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-[#ff7a7a]"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Ištrinti
                </button>
              )
            ) : (
              <ReportLink
                what={`nuotrauka klubo „${club.name}“ puslapyje (įkėlė ${photo.author.name})`}
                path={`/clubs/${club.slug}`}
                id={photo.id}
                className="text-[12px] text-slate-400"
              />
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}

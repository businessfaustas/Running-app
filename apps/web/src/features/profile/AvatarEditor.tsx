import type { Profile } from '@pacemates/shared'
import { Camera, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useSetAvatar } from '../../data/hooks'
import { ImageError, squarePhoto } from '../../lib/image'
import { toast, toastError } from '../../lib/toast'

/**
 * Profile photo: pick one from the phone (or take a picture), it's cropped square and shrunk
 * on the device, then saved straight away. Removing it brings back the initials.
 */
export function AvatarEditor({ profile, name }: { profile: Profile; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const setAvatar = useSetAvatar()
  const [preview, setPreview] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Free the preview's memory once it's replaced or the page closes.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // picking the same file again should still work
    if (!file) return
    try {
      const photo = await squarePhoto(file)
      setPreview(URL.createObjectURL(photo))
      setAvatar.mutate(photo, {
        onSuccess: () => toast('Nuotrauka atnaujinta'),
        onError: (error) => {
          setPreview(null)
          toastError(error)
        },
      })
    } catch (error) {
      toast(error instanceof ImageError ? error.message : 'Nuotraukos įkelti nepavyko', 'error')
    }
  }

  const remove = () =>
    setAvatar.mutate(null, {
      onSuccess: () => {
        setPreview(null)
        setConfirmRemove(false)
        toast('Nuotrauka pašalinta')
      },
      onError: toastError,
    })

  const shown = { ...profile, name: name || profile.name, avatarUrl: preview ?? profile.avatarUrl }
  const busy = setAvatar.isPending

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={profile.avatarUrl ? 'Pakeisti nuotrauką' : 'Įkelti nuotrauką'}
        className="relative shrink-0 rounded-full transition active:scale-95"
      >
        <Avatar user={shown} size={84} className="ring-4 ring-white/10" />
        <span className="absolute -right-0.5 -bottom-0.5 grid size-8 place-items-center rounded-full bg-volt text-black ring-4 ring-ink">
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Camera className="size-4" aria-hidden />
          )}
        </span>
      </button>
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-white">Profilio nuotrauka</p>
        <p className="text-[12px] text-slate-500">
          {profile.avatarUrl ? 'Matoma kitiems sportininkams.' : 'Kol jos nėra, rodomi inicialai.'}
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {profile.avatarUrl ? 'Pakeisti' : 'Įkelti nuotrauką'}
          </Button>
          {profile.avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmRemove(true)}
            >
              Pašalinti
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
      <ConfirmDialog
        open={confirmRemove}
        title="Pašalinti nuotrauką?"
        confirmLabel="Pašalinti"
        destructive
        busy={busy}
        onConfirm={remove}
        onClose={() => setConfirmRemove(false)}
      >
        Vietoj jos vėl bus rodomi tavo inicialai.
      </ConfirmDialog>
    </div>
  )
}

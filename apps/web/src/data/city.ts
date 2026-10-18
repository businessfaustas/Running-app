import { cityById, DEFAULT_CITY_ID, type City } from '@pacemates/shared'
import { useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { toastError } from '../lib/toast'
import { useSession } from './auth'
import { keys, useMe, useUpdateProfile } from './hooks'

const KEY = 'pacemates:city'

function readStored(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** The town picked on this device – used when signed out, and while a change is saving. */
const useDeviceCity = create<{ id: string | null }>(() => ({ id: readStored() }))

/**
 * Where the person trains: their profile's town when signed in, otherwise the one picked on
 * this device, otherwise Vilnius.
 */
export function useCity(): City {
  const session = useSession()
  const me = useMe()
  const deviceId = useDeviceCity((s) => s.id)
  const profileId = session ? me.data?.city : null
  return cityById(profileId ?? deviceId ?? DEFAULT_CITY_ID)
}

export function useSetCity() {
  const session = useSession()
  const me = useMe()
  const queryClient = useQueryClient()
  const update = useUpdateProfile()
  return (id: string) => {
    try {
      localStorage.setItem(KEY, id)
    } catch {
      // Private mode: the choice lasts until the page closes.
    }
    useDeviceCity.setState({ id })
    if (session && me.data) {
      // Show the new town straight away; the save confirms it.
      queryClient.setQueryData(keys.profile(me.data.id), { ...me.data, city: id })
      update.mutate({ city: id }, { onError: toastError })
    }
  }
}

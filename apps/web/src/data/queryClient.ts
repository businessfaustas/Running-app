import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { MESSAGES } from '../backend/messages'
import { BackendError } from '../backend/types'
import { reportError } from '../lib/monitoring'

/** Friendly backend errors are expected; anything else is a bug worth recording. */
function reportUnexpected(error: unknown) {
  if (!(error instanceof BackendError)) reportError(error)
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: reportUnexpected }),
  mutationCache: new MutationCache({ onError: reportUnexpected }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // A friendly error (not found, not allowed) won't change on retry; a network blip might.
      retry: (failures, error) =>
        failures < 2 && (!(error instanceof BackendError) || error.message === MESSAGES.offline),
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Offline, try at once and say so ("Nėra ryšio…") rather than waiting silently behind a
      // spinner until the connection comes back. What was typed stays in the form.
      networkMode: 'always',
    },
  },
})

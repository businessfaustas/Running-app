import { useQuery } from '@tanstack/react-query'
import { fetchSlots } from '../../lib/api'

export function useSlots(from: string, to: string) {
  return useQuery({
    queryKey: ['slots', { from, to }],
    queryFn: () => fetchSlots({ from, to }),
  })
}

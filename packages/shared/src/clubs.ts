import type { Club } from './domain'

export const CLUBS: Club[] = []

export const clubBySlug = (slug: string) => CLUBS.find((club) => club.slug === slug)

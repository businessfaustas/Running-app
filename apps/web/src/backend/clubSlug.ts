/** "Bėgimo klubas „Vėjas“" → "begimo-klubas-vejas-k3f9": readable, with a random ending so
 *  two clubs with the same name (or one named like a listed club) never share an address. */
export function newClubSlug(
  name: string,
  random = () => crypto.getRandomValues(new Uint32Array(1))[0]!,
): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '')
  const suffix = random().toString(36).padStart(4, '0').slice(-4)
  return `${base || 'klubas'}-${suffix}`
}

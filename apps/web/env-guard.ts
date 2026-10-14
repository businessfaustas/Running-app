import { loadEnv, type Plugin } from 'vite'

/*
 * Everything in a VITE_ / NEXT_PUBLIC_ variable ends up in the JavaScript anyone can download.
 * Public keys (Supabase anon/publishable, Sentry DSN) belong there; secrets never do. This
 * stops the build if a secret was put in a public variable by mistake.
 */

export const PUBLIC_ENV_PREFIXES = ['VITE_', 'NEXT_PUBLIC_']

function jwtRole(value: string): string | null {
  const parts = value.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as {
      role?: unknown
    }
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

/** Why a public variable looks like a secret, or null when it's fine. */
export function secretReason(name: string, value: string): string | null {
  if (!value) return null
  if (value.startsWith('sb_secret_')) return 'a Supabase secret key'
  if (jwtRole(value) === 'service_role') return 'a Supabase service_role key'
  if (value.startsWith('sntrys_') || value.startsWith('sntryu_')) return 'a Sentry auth token'
  if (/^(sk|rk)_(live|test)_/.test(value)) return 'a Stripe secret key'
  if (/^postgres(ql)?:\/\//.test(value)) return 'a database connection string'
  if (/SERVICE_ROLE|SECRET|PASSWORD|PRIVATE_KEY|JWT_SECRET/i.test(name)) {
    return 'a secret, judging by its name'
  }
  return null
}

export function publicEnvGuard(): Plugin {
  return {
    name: 'pacemates:public-env-guard',
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), PUBLIC_ENV_PREFIXES)
      const problems = Object.entries(env)
        .map(([name, value]) => [name, secretReason(name, value)] as const)
        .filter(([, reason]) => reason)
        .map(([name, reason]) => `  ${name} looks like ${reason}`)
      if (problems.length > 0) {
        throw new Error(
          `Refusing to build: these variables would be shipped to every browser.\n${problems.join('\n')}\n` +
            'Rename them without the VITE_/NEXT_PUBLIC_ prefix (server-only) or use the public key instead.',
        )
      }
    },
  }
}

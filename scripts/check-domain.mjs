// Checks a live domain's HTTPS certificate, security headers and e-mail authentication.
//
//   node scripts/check-domain.mjs pacemates.lt [dkim-selector]
//
// DKIM selectors differ by e-mail provider (Resend: "resend", Postmark: "pm", Google: "google");
// pass yours as the second argument. Exit code 1 when something needed is missing.
import { resolveTxt, resolveMx } from 'node:dns/promises'
import { connect } from 'node:tls'

const domain = process.argv[2]
const selector = process.argv[3] ?? 'resend'
if (!domain) {
  console.error('usage: node scripts/check-domain.mjs <domain> [dkim-selector]')
  process.exit(2)
}

let bad = 0
const ok = (msg) => console.log(`✓ ${msg}`)
const no = (msg) => {
  bad++
  console.log(`✗ ${msg}`)
}
const txt = async (name) => {
  try {
    return (await resolveTxt(name)).map((parts) => parts.join(''))
  } catch {
    return []
  }
}

// HTTPS certificate
await new Promise((resolve) => {
  const socket = connect({ host: domain, port: 443, servername: domain, timeout: 10_000 }, () => {
    const cert = socket.getPeerCertificate()
    const days = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000)
    if (!socket.authorized) no(`HTTPS certificate is not trusted (${socket.authorizationError})`)
    else if (days < 14) no(`HTTPS certificate expires in ${days} days`)
    else ok(`HTTPS certificate valid for ${days} more days (issuer: ${cert.issuer?.O ?? '?'})`)
    socket.end()
    resolve()
  })
  socket.on('error', (e) => {
    no(`HTTPS connection failed: ${e.message}`)
    resolve()
  })
  socket.on('timeout', () => {
    no('HTTPS connection timed out')
    socket.destroy()
    resolve()
  })
})

// Security headers and redirect from http
try {
  const res = await fetch(`https://${domain}/`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  })
  res.headers.get('strict-transport-security') ? ok('HSTS header set') : no('HSTS header missing')
  res.headers.get('content-security-policy')
    ? ok('Content-Security-Policy set')
    : no('Content-Security-Policy missing')
  res.headers.get('x-content-type-options') === 'nosniff'
    ? ok('X-Content-Type-Options: nosniff')
    : no('X-Content-Type-Options missing')
  const http = await fetch(`http://${domain}/`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  })
  ;[301, 302, 307, 308].includes(http.status) &&
  String(http.headers.get('location')).startsWith('https://')
    ? ok('http:// redirects to https://')
    : no(`http:// does not redirect to https:// (status ${http.status})`)
} catch (e) {
  no(`Could not fetch the site: ${e.message}`)
}

// E-mail authentication
const spf = (await txt(domain)).find((r) => r.startsWith('v=spf1'))
spf ? ok(`SPF: ${spf}`) : no('SPF record missing (a TXT record starting v=spf1)')
if (spf && !/[-~]all\b/.test(spf)) no('SPF should end in -all or ~all')
const dkim = (await txt(`${selector}._domainkey.${domain}`)).find((r) => /v=DKIM1|p=/.test(r))
dkim
  ? ok(`DKIM (${selector}): published`)
  : no(`DKIM record missing at ${selector}._domainkey.${domain}`)
const dmarc = (await txt(`_dmarc.${domain}`)).find((r) => r.startsWith('v=DMARC1'))
if (!dmarc) no('DMARC record missing (a TXT record at _dmarc with v=DMARC1; p=…)')
else {
  const policy = /p=(\w+)/.exec(dmarc)?.[1]
  policy === 'none'
    ? no(`DMARC is only monitoring (p=none): ${dmarc} – move to quarantine once mail is verified`)
    : ok(`DMARC: ${dmarc}`)
}
try {
  const mx = await resolveMx(domain)
  mx.length
    ? ok(`MX: ${mx.map((m) => m.exchange).join(', ')}`)
    : console.log('· no MX (fine if you only send mail)')
} catch {
  console.log('· no MX (fine if you only send mail)')
}

console.log(bad ? `\n${bad} thing(s) to fix.` : '\nAll good.')
process.exit(bad ? 1 : 0)

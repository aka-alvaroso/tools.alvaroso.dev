export type AuthStatus = 'pass' | 'fail' | 'softfail' | 'neutral' | 'none'
export type Verdict     = 'safe' | 'suspicious' | 'dangerous'
export type Severity    = 'high' | 'medium' | 'low'

export interface AuthResult {
  spf:   AuthStatus
  dkim:  AuthStatus
  dmarc: AuthStatus
}

export interface RoutingHop {
  from:         string | null
  by:           string | null
  ip:           string | null
  timestamp:    Date   | null
  delaySeconds: number | null
}

export interface Flag {
  severity: Severity
  label:    string
  detail:   string
}

export interface UrlEntry {
  href:       string
  anchor:     string | null
  suspicious: boolean
  reason?:    string
}

export interface EmailAnalysis {
  verdict:     Verdict
  score:       number
  from:        string | null
  fromName:    string | null
  fromDomain:  string | null
  to:          string | null
  subject:     string | null
  date:        string | null
  messageId:   string | null
  replyTo:     string | null
  returnPath:  string | null
  auth:        AuthResult
  flags:       Flag[]
  routing:     RoutingHop[]
  urls:        UrlEntry[]
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function decodeRfc2047(value: string): string {
  return value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (orig, charset, enc, text) => {
    try {
      if (enc.toUpperCase() === 'B') {
        const bytes = Uint8Array.from(atob(text), c => c.charCodeAt(0))
        return new TextDecoder(charset).decode(bytes)
      } else {
        // Quoted-Printable
        const qp = text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g,
          (_: string, h: string) => String.fromCharCode(parseInt(h, 16)))
        return new TextDecoder(charset).decode(
          Uint8Array.from(qp, c => c.charCodeAt(0))
        )
      }
    } catch { return orig }
  })
}

function unfold(raw: string): string {
  return raw.replace(/\r?\n[ \t]+/g, ' ')
}

function splitParts(raw: string): { headerStr: string; body: string } {
  const idx = raw.search(/\r?\n\r?\n/)
  if (idx === -1) return { headerStr: raw, body: '' }
  return { headerStr: raw.slice(0, idx), body: raw.slice(idx + 2).trim() }
}

function parseHeaderMap(headerStr: string): Map<string, string[]> {
  const map  = new Map<string, string[]>()
  const lines = unfold(headerStr).split(/\r?\n/)
  for (const line of lines) {
    const colon = line.indexOf(':')
    if (colon < 1) continue
    const key = line.slice(0, colon).trim().toLowerCase()
    const val = line.slice(colon + 1).trim()
    const arr = map.get(key) ?? []
    arr.push(val)
    map.set(key, arr)
  }
  return map
}

function parseAddress(raw: string): { name: string | null; email: string | null; domain: string | null } {
  if (!raw) return { name: null, email: null, domain: null }

  const withAngle = raw.match(/^"?([^"<]*?)"?\s*<([^>]+)>/)
  if (withAngle) {
    const name   = withAngle[1].trim() || null
    const email  = withAngle[2].trim().toLowerCase()
    const domain = email.split('@')[1] ?? null
    return { name, email, domain }
  }

  const bare = raw.match(/([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)/)
  if (bare) {
    const email  = bare[1].toLowerCase()
    const domain = email.split('@')[1] ?? null
    return { name: null, email, domain }
  }

  return { name: null, email: null, domain: null }
}

function parseAuth(headers: Map<string, string[]>): AuthResult {
  const combined = (headers.get('authentication-results') ?? []).join(' ').toLowerCase()

  const read = (proto: string): AuthStatus => {
    const m = combined.match(new RegExp(`${proto}=(pass|fail|softfail|neutral|none|temperror|permerror)`))
    if (!m) return 'none'
    const v = m[1]
    if (v === 'pass')                       return 'pass'
    if (v === 'fail' || v === 'permerror')  return 'fail'
    if (v === 'softfail')                   return 'softfail'
    return 'neutral'
  }

  return { spf: read('spf'), dkim: read('dkim'), dmarc: read('dmarc') }
}

function parseRouting(received: string[]): RoutingHop[] {
  const hops: RoutingHop[] = received.map(h => {
    const fromM  = h.match(/from\s+(\S+)/i)
    const byM    = h.match(/by\s+(\S+)/i)
    const ipM    = h.match(/\[(\d{1,3}(?:\.\d{1,3}){3})\]/)
    const dateM  = h.match(/;\s*(.+)$/)

    let timestamp: Date | null = null
    if (dateM) {
      const d = new Date(dateM[1].trim())
      if (!isNaN(d.getTime())) timestamp = d
    }

    return {
      from:         fromM?.[1] ?? null,
      by:           byM?.[1]   ?? null,
      ip:           ipM?.[1]   ?? null,
      timestamp,
      delaySeconds: null,
    }
  })

  // Received headers are newest-first; reverse to show oldest-first
  hops.reverse()

  for (let i = 1; i < hops.length; i++) {
    const prev = hops[i - 1].timestamp
    const curr = hops[i].timestamp
    if (prev && curr) {
      hops[i].delaySeconds = Math.round((curr.getTime() - prev.getTime()) / 1000)
    }
  }

  return hops
}

const SHORTENERS = new Set([
  'bit.ly', 't.co', 'goo.gl', 'tinyurl.com', 'ow.ly',
  'is.gd', 'buff.ly', 'short.link', 'rb.gy', 'tiny.cc',
])

function checkUrl(href: string, anchor: string | null): { suspicious: boolean; reason?: string } {
  let url: URL
  try { url = new URL(href) } catch { return { suspicious: false } }

  const host = url.hostname.toLowerCase()

  if (SHORTENERS.has(host)) {
    return { suspicious: true, reason: 'URL shortener hides the real destination' }
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return { suspicious: true, reason: 'IP address used instead of a domain name' }
  }

  if (anchor) {
    const m = anchor.match(/([a-z0-9-]+\.[a-z]{2,})/i)
    if (m) {
      const ad = m[1].toLowerCase()
      if (ad !== host && !host.endsWith('.' + ad) && !ad.endsWith('.' + host)) {
        return { suspicious: true, reason: `Anchor shows "${ad}" but link goes to "${host}"` }
      }
    }
  }

  return { suspicious: false }
}

function extractUrls(body: string): UrlEntry[] {
  if (!body) return []

  const seen    = new Set<string>()
  const entries: UrlEntry[] = []

  // HTML anchors
  const anchorRe = /href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(body)) !== null) {
    const href   = m[1].trim()
    const anchor = m[2].replace(/<[^>]+>/g, '').trim() || null
    if (!seen.has(href)) {
      seen.add(href)
      const { suspicious, reason } = checkUrl(href, anchor)
      entries.push({ href, anchor, suspicious, reason })
    }
  }

  // Plain-text URLs
  const plainRe = /https?:\/\/[^\s<>"')\]]+/gi
  while ((m = plainRe.exec(body)) !== null) {
    const href = m[0].replace(/[.,;:!?]+$/, '')
    if (!seen.has(href)) {
      seen.add(href)
      const { suspicious, reason } = checkUrl(href, null)
      entries.push({ href, anchor: null, suspicious, reason })
    }
  }

  return entries.slice(0, 20)
}

function buildFlags(
  auth:       AuthResult,
  from:       ReturnType<typeof parseAddress>,
  replyTo:    ReturnType<typeof parseAddress> | null,
  returnPath: ReturnType<typeof parseAddress> | null,
  urls:       UrlEntry[],
): Flag[] {
  const flags: Flag[] = []

  if (auth.dmarc === 'fail') {
    flags.push({ severity: 'high', label: 'DMARC failed', detail: 'Domain policy check failed — high spoofing risk.' })
  }
  if (auth.dkim === 'fail') {
    flags.push({ severity: 'high', label: 'DKIM signature invalid', detail: 'Email signature is invalid — message may have been tampered with.' })
  }
  if (auth.spf === 'fail') {
    flags.push({ severity: 'medium', label: 'SPF failed', detail: "Sending server is not authorized by the sender's domain." })
  }
  if (auth.spf === 'softfail') {
    flags.push({ severity: 'low', label: 'SPF soft fail', detail: "Sending server not explicitly authorized (policy isn't strict)." })
  }

  if (from.domain && replyTo?.domain && replyTo.domain !== from.domain) {
    flags.push({
      severity: 'low',
      label:  'Reply-To domain mismatch',
      detail: `Replies go to "${replyTo.domain}" instead of "${from.domain}". Common in marketing emails — suspicious only if combined with auth failures.`,
    })
  }

  if (from.domain && returnPath?.domain && returnPath.domain !== from.domain) {
    flags.push({
      severity: 'low',
      label:  'Return-Path domain mismatch',
      detail: `Bounces go to "${returnPath.domain}" instead of "${from.domain}". Normal for email service providers.`,
    })
  }

  // Display name contains a domain that doesn't match the actual sender
  if (from.name && from.domain) {
    const dm = from.name.match(/([a-z0-9-]+\.[a-z]{2,})/i)
    if (dm) {
      const nd = dm[1].toLowerCase()
      if (!from.domain.endsWith(nd) && !nd.endsWith(from.domain)) {
        flags.push({
          severity: 'high',
          label:  'Display name spoofing',
          detail: `Display name contains "${nd}" but actual sender is "@${from.domain}".`,
        })
      }
    }
  }

  const suspUrls = urls.filter(u => u.suspicious)
  if (suspUrls.length > 0) {
    flags.push({
      severity: suspUrls.length >= 3 ? 'high' : 'medium',
      label:  `${suspUrls.length} suspicious link${suspUrls.length > 1 ? 's' : ''}`,
      detail: suspUrls[0].reason ?? 'One or more links appear suspicious.',
    })
  }

  return flags
}

function calcVerdict(flags: Flag[]): { verdict: Verdict; score: number } {
  const high   = flags.filter(f => f.severity === 'high').length
  const medium = flags.filter(f => f.severity === 'medium').length
  // low flags are informational only — they don't affect the verdict score
  const score  = high * 3 + medium

  if (high >= 1 || score >= 4) return { verdict: 'dangerous', score }
  if (score >= 1)              return { verdict: 'suspicious', score }
  return                              { verdict: 'safe',       score }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function analyzeEmail(raw: string): EmailAnalysis {
  const { headerStr, body } = splitParts(raw.trim())
  const headers = parseHeaderMap(headerStr)

  const get1 = (k: string) => headers.get(k)?.[0] ?? null

  const fromParsed       = parseAddress(get1('from')        ?? '')
  const replyToParsed    = parseAddress(get1('reply-to')    ?? '')
  const returnPathParsed = parseAddress(get1('return-path') ?? '')

  const auth    = parseAuth(headers)
  const routing = parseRouting(headers.get('received') ?? [])
  const urls    = extractUrls(body)
  const flags   = buildFlags(auth, fromParsed, replyToParsed, returnPathParsed, urls)
  const { verdict, score } = calcVerdict(flags)

  const rawSubject = get1('subject')

  return {
    verdict,
    score,
    from:       fromParsed.email,
    fromName:   fromParsed.name ? decodeRfc2047(fromParsed.name) : null,
    fromDomain: fromParsed.domain,
    to:         get1('to'),
    subject:    rawSubject ? decodeRfc2047(rawSubject) : null,
    date:       get1('date'),
    messageId:  get1('message-id'),
    replyTo:    replyToParsed.email,
    returnPath: returnPathParsed.email,
    auth,
    flags,
    routing,
    urls,
  }
}

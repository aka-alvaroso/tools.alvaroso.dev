import { useMemo, useState } from 'react';
import { X, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp, ExternalLink, Info } from 'lucide-react';
import { analyzeEmail, type EmailAnalysis, type AuthStatus, type Verdict, type Severity } from '../../lib/email-parser';

// ── Verdict config ─────────────────────────────────────────────────────────────

const VERDICT_META: Record<Verdict, { label: string; sub: string; color: string; bg: string; Icon: typeof ShieldCheck }> = {
  safe:       { label: 'Safe',       sub: 'No threats detected',        color: '#23CE6B', bg: 'rgba(35,206,107,0.10)',  Icon: ShieldCheck },
  suspicious: { label: 'Suspicious', sub: 'Potential issues found',     color: '#FFDB4D', bg: 'rgba(255,219,77,0.12)',  Icon: ShieldAlert },
  dangerous:  { label: 'Dangerous',  sub: 'High-risk email detected',   color: '#E63841', bg: 'rgba(230,56,65,0.10)',   Icon: ShieldX     },
};

// ── Auth badge ─────────────────────────────────────────────────────────────────

const AUTH_COLOR: Record<AuthStatus, string> = {
  pass:     '#23CE6B',
  fail:     '#E63841',
  softfail: '#FFDB4D',
  neutral:  '#9A9A9A',
  none:     '#9A9A9A',
};

const AUTH_LABEL: Record<AuthStatus, string> = {
  pass:     'pass',
  fail:     'fail',
  softfail: 'soft fail',
  neutral:  'neutral',
  none:     'none',
};

function AuthBadge({ proto, status }: { proto: string; status: AuthStatus }) {
  const color = AUTH_COLOR[status];
  return (
    <div
      className="flex-1 rounded-2xl px-4 py-3 flex flex-col items-center gap-0.5"
      style={{ background: `${color}18` }}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#888' }}>{proto}</span>
      <span className="text-sm font-black italic" style={{ color }}>{AUTH_LABEL[status]}</span>
    </div>
  );
}

// ── Severity dot ───────────────────────────────────────────────────────────────

const SEV_COLOR: Record<Severity, string> = {
  high:   '#E63841',
  medium: '#FFDB4D',
  low:    '#9A9A9A',
};

// ── Collapsible section ────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-dark/5 rounded-3xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer"
      >
        <span className="text-sm font-black">{title}</span>
        {open
          ? <ChevronUp   size={15} className="text-gray-400" />
          : <ChevronDown size={15} className="text-gray-400" />
        }
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({ label, value, highlight }: { label: string; value: string | null; highlight?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-dark/5 last:border-0">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-dark break-all flex-1" style={highlight ? { color: highlight, fontWeight: 700, fontStyle: 'italic' } : {}}>
        {value}
      </span>
    </div>
  );
}

// ── Truncate list ──────────────────────────────────────────────────────────────

function TruncatedList<T>({ items, limit = 4, renderItem }: {
  items: T[]; limit?: number; renderItem: (item: T, i: number) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  const hidden  = items.length - limit;
  return (
    <div>
      {visible.map((item, i) => renderItem(item, i))}
      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-gray-400 font-semibold hover:text-dark transition-colors cursor-pointer"
        >
          Show {hidden} more…
        </button>
      )}
    </div>
  );
}

const AUTH_INFO = [
  {
    proto: 'SPF',
    desc:  'Verifies the sending server is on the list of servers the domain has authorized to send email.',
  },
  {
    proto: 'DKIM',
    desc:  'A cryptographic signature attached to the email. Pass means it wasn\'t altered in transit.',
  },
  {
    proto: 'DMARC',
    desc:  'Combines SPF and DKIM into a policy. Determines what happens when those checks fail.',
  },
];

// ── Results ────────────────────────────────────────────────────────────────────

function Results({ analysis }: { analysis: EmailAnalysis }) {
  const [showAuthInfo, setShowAuthInfo] = useState(false);
  const meta = VERDICT_META[analysis.verdict];
  const { Icon } = meta;

  const showReplyTo    = analysis.replyTo    && analysis.replyTo    !== analysis.from;
  const showReturnPath = analysis.returnPath && analysis.returnPath !== analysis.from;

  return (
    <div className="flex flex-col gap-3" style={{ animation: 'fadeIn 0.2s ease-out' }}>

      {/* Verdict banner */}
      <div
        className="rounded-3xl px-5 py-4 flex items-center gap-4"
        style={{ background: meta.bg }}
      >
        <Icon size={32} strokeWidth={2.5} style={{ color: meta.color, flexShrink: 0 }} />
        <div>
          <p className="font-black italic text-lg leading-tight" style={{ color: meta.color }}>
            {meta.label}
          </p>
          <p className="text-sm text-gray-500">{meta.sub}</p>
        </div>
      </div>

      {/* Auth row + explainer */}
      <div className="bg-dark/5 rounded-3xl px-5 py-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <AuthBadge proto="SPF"   status={analysis.auth.spf}   />
          <AuthBadge proto="DKIM"  status={analysis.auth.dkim}  />
          <AuthBadge proto="DMARC" status={analysis.auth.dmarc} />
        </div>
        <button
          onClick={() => setShowAuthInfo(o => !o)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-dark transition-colors cursor-pointer w-fit"
        >
          {showAuthInfo
            ? <ChevronUp   size={13} strokeWidth={2.5} />
            : <ChevronDown size={13} strokeWidth={2.5} />
          }
          What are these checks?
        </button>
        {showAuthInfo && (
          <div className="flex flex-col gap-2.5" style={{ animation: 'fadeIn 0.15s ease-out' }}>
            {AUTH_INFO.map(({ proto, desc }) => (
              <div key={proto} className="flex items-start gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 w-12 flex-shrink-0 pt-0.5">{proto}</span>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key fields */}
      <Section title="Key Fields">
        <FieldRow label="From"        value={analysis.fromName ? `${analysis.fromName} <${analysis.from}>` : analysis.from} />
        <FieldRow label="To"          value={analysis.to} />
        <FieldRow label="Subject"     value={analysis.subject} />
        <FieldRow label="Date"        value={analysis.date} />
        {showReplyTo    && <FieldRow label="Reply-To"    value={analysis.replyTo}    highlight="#E63841" />}
        {showReturnPath && <FieldRow label="Return-Path" value={analysis.returnPath} />}
        <FieldRow label="Message-ID"  value={analysis.messageId} />
      </Section>

      {/* Flags */}
      {analysis.flags.length > 0 && (
        <Section title={`Flags (${analysis.flags.length})`}>
          <div className="flex flex-col gap-3">
            {analysis.flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: SEV_COLOR[flag.severity] }}
                />
                <div>
                  <p className="text-sm font-black leading-tight">{flag.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{flag.detail}</p>
                </div>
                <span
                  className="ml-auto text-[10px] font-bold uppercase tracking-wide flex-shrink-0 mt-0.5"
                  style={{ color: SEV_COLOR[flag.severity] }}
                >
                  {flag.severity}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Routing */}
      {analysis.routing.length > 0 && (
        <Section title={`Routing (${analysis.routing.length} hop${analysis.routing.length !== 1 ? 's' : ''})`} defaultOpen={analysis.routing.length <= 4}>
          <TruncatedList
            items={analysis.routing}
            limit={4}
            renderItem={(hop, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
                  <div className="w-2 h-2 rounded-full bg-blue/60" />
                  {i < analysis.routing.length - 1 && (
                    <div className="w-px h-4 bg-dark/10" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {hop.ip && (
                      <span className="font-mono text-xs font-bold text-dark">{hop.ip}</span>
                    )}
                    {hop.by && (
                      <span className="text-xs text-gray-500 truncate">{hop.by}</span>
                    )}
                    {hop.delaySeconds !== null && (
                      <span
                        className="ml-auto text-[10px] font-bold flex-shrink-0"
                        style={{ color: hop.delaySeconds > 300 ? '#FFDB4D' : '#9A9A9A' }}
                      >
                        {hop.delaySeconds < 60
                          ? `+${hop.delaySeconds}s`
                          : `+${Math.round(hop.delaySeconds / 60)}m`}
                      </span>
                    )}
                  </div>
                  {hop.timestamp && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {hop.timestamp.toUTCString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          />
        </Section>
      )}

      {/* URLs */}
      {analysis.urls.length > 0 && (
        <Section title={`Links in email body (${analysis.urls.length})`} defaultOpen={false}>
          <p className="text-xs text-gray-400 mb-3">URLs extracted from the email's HTML content. Suspicious ones are flagged in red.</p>
          <TruncatedList
            items={analysis.urls}
            limit={5}
            renderItem={(url, i) => (
              <div key={i} className="py-2">
                <div className="flex items-start gap-2">
                  {url.suspicious && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red flex-shrink-0 mt-1.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={url.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-blue break-all hover:underline flex items-center gap-1"
                    >
                      {url.href.length > 60 ? url.href.slice(0, 60) + '…' : url.href}
                      <ExternalLink size={10} className="flex-shrink-0 opacity-50" />
                    </a>
                    {url.anchor && url.anchor !== url.href && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Anchor: {url.anchor}</p>
                    )}
                    {url.suspicious && url.reason && (
                      <p className="text-[10px] text-red mt-0.5">{url.reason}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        </Section>
      )}

    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EmailAnalyzer() {
  const [raw, setRaw] = useState('');

  const analysis = useMemo<EmailAnalysis | null>(() => {
    if (!raw.trim()) return null;
    try { return analyzeEmail(raw); } catch { return null; }
  }, [raw]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">

      {/* Input */}
      <div className="mb-6">
        {raw ? (
          <div className="bg-dark/5 rounded-3xl overflow-hidden">
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              rows={6}
              spellCheck={false}
              className="w-full px-5 pt-5 pb-3 bg-transparent text-dark text-xs font-mono resize-none outline-none leading-relaxed scroll-subtle"
            />
            <div className="flex items-center justify-between px-5 pb-4">
              <span className="text-[10px] text-gray-400">{raw.length.toLocaleString()} chars</span>
              <button
                onClick={() => setRaw('')}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-dark transition-colors cursor-pointer"
              >
                <X size={11} strokeWidth={2.5} />
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue p-[6px] rounded-[38px]">
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              rows={3}
              spellCheck={false}
              className="w-full block bg-light rounded-[32px] p-4 text-[20px] text-dark resize-none outline-none leading-snug placeholder:text-gray-400"
              placeholder="Paste an email to analyze it."
            />
            <div className="flex items-center gap-3 text-white py-[10px]">
              <Info size={20} className="flex-shrink-0" />
              <span className="text-[16px] font-semibold">Gmail → Show Original → Copy to Clipboard</span>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {analysis && <Results analysis={analysis} />}

    </div>
  );
}

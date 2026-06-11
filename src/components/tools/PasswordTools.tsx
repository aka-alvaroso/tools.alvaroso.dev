import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check, RefreshCw, Eye, EyeOff, X } from 'lucide-react';
import zxcvbn from 'zxcvbn';
import { WORDLIST } from '../../data/wordlist';

type Tab      = 'generator' | 'checker' | 'passphrase';
type Strength = 'weak' | 'fair' | 'strong' | 'very-strong';
type WordFmt  = 'lower' | 'title' | 'upper' | 'camel';

// ── Character sets ──────────────────────────────────────────────────────────────
const CHARS = {
  upper:  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:  'abcdefghijklmnopqrstuvwxyz',
  number: '0123456789',
  symbol: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

function generatePassword(
  length: number,
  opts: { upper: boolean; lower: boolean; number: boolean; symbol: boolean },
): string {
  let charset = '';
  const required: string[] = [];
  if (opts.upper)  { charset += CHARS.upper;  required.push(CHARS.upper[Math.floor(Math.random() * CHARS.upper.length)]); }
  if (opts.lower)  { charset += CHARS.lower;  required.push(CHARS.lower[Math.floor(Math.random() * CHARS.lower.length)]); }
  if (opts.number) { charset += CHARS.number; required.push(CHARS.number[Math.floor(Math.random() * CHARS.number.length)]); }
  if (opts.symbol) { charset += CHARS.symbol; required.push(CHARS.symbol[Math.floor(Math.random() * CHARS.symbol.length)]); }
  if (!charset) return '';
  const rest = Array.from(
    { length: Math.max(0, length - required.length) },
    () => charset[Math.floor(Math.random() * charset.length)],
  );
  const all = [...required, ...rest];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.join('');
}

// ── Passphrase helpers ──────────────────────────────────────────────────────────
function genPassphrase(count: number): string[] {
  const arr = new Uint32Array(count);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => WORDLIST[n % WORDLIST.length]);
}

function applyFmt(word: string, fmt: WordFmt, i: number): string {
  switch (fmt) {
    case 'lower': return word.toLowerCase();
    case 'title': return word[0].toUpperCase() + word.slice(1).toLowerCase();
    case 'upper': return word.toUpperCase();
    case 'camel': return i === 0
      ? word.toLowerCase()
      : word[0].toUpperCase() + word.slice(1).toLowerCase();
  }
}

function passphraseEntropy(count: number): number {
  return Math.round(count * Math.log2(WORDLIST.length));
}

// ── Strength ────────────────────────────────────────────────────────────────────
const CRITERIA: { key: string; label: string; test: (p: string) => boolean }[] = [
  { key: 'len8',   label: 'At least 8 characters',  test: p => p.length >= 8  },
  { key: 'len12',  label: 'At least 12 characters', test: p => p.length >= 12 },
  { key: 'len16',  label: 'At least 16 characters', test: p => p.length >= 16 },
  { key: 'upper',  label: 'Uppercase letters (A–Z)', test: p => /[A-Z]/.test(p) },
  { key: 'lower',  label: 'Lowercase letters (a–z)', test: p => /[a-z]/.test(p) },
  { key: 'number', label: 'Numbers (0–9)',            test: p => /[0-9]/.test(p) },
  { key: 'symbol', label: 'Special characters',      test: p => /[^A-Za-z0-9]/.test(p) },
];

function calcStrength(password: string): { strength: Strength; met: boolean[]; score: number } {
  const met   = CRITERIA.map(c => c.test(password));
  const score = met.filter(Boolean).length;
  const strength: Strength =
    score <= 2 ? 'weak' : score <= 4 ? 'fair' : score <= 5 ? 'strong' : 'very-strong';
  return { strength, met, score };
}

const STRENGTH_META: Record<Strength, { label: string; color: string; pct: number }> = {
  'weak':        { label: 'Weak',        color: '#E63841', pct: 25  },
  'fair':        { label: 'Fair',        color: '#FFDB4D', pct: 50  },
  'strong':      { label: 'Strong',      color: '#23CE6B', pct: 75  },
  'very-strong': { label: 'Very Strong', color: '#23CE6B', pct: 100 },
};

// ── Crack time via zxcvbn ───────────────────────────────────────────────────────
function crackTime(password: string): { label: string; color: string } | null {
  if (!password) return null;
  const secs = zxcvbn(password).crack_times_seconds
    .offline_fast_hashing_1e10_per_second as number;

  const R = '#E63841', Y = '#FFDB4D', G = '#23CE6B';

  if (!isFinite(secs) || secs > 1e15) return { label: '10^+ years', color: G };
  if (secs < 1)            return { label: 'instantly',                                color: R };
  if (secs < 60)           return { label: `${Math.round(secs)} sec`,                  color: R };
  if (secs < 3_600)        return { label: `${Math.round(secs / 60)} min`,             color: R };
  if (secs < 86_400)       return { label: `${Math.round(secs / 3_600)} hr`,           color: R };
  if (secs < 86_400 * 30)  return { label: `${Math.round(secs / 86_400)} days`,        color: Y };
  if (secs < 86_400 * 365) return { label: `${Math.round(secs / 86_400 / 30)} months`, color: Y };

  const years = secs / 86_400 / 365;
  if (years < 1_000) return { label: `${Math.round(years).toLocaleString()} years`, color: G };
  return { label: `10^${Math.round(Math.log10(years))} years`, color: G };
}

// ── Shared sub-components ───────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 p-1.5 rounded-xl transition-colors duration-150 hover:bg-dark/10 cursor-pointer"
      title="Copy"
    >
      {copied
        ? <Check size={14} strokeWidth={3} className="text-green" />
        : <Copy  size={14} className="text-gray-400" />
      }
    </button>
  );
}

// Continuous range slider — used for password length
function PillSlider({
  label, min, max, value, onChange,
}: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw]         = useState('');
  const inputRef              = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setRaw(String(value));
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 0);
  };

  const commit = () => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
    setEditing(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className="flex items-center bg-dark/5 rounded-full pl-1.5 pr-4 py-1.5 mb-4 gap-3">
      <span className="bg-light rounded-full px-4 py-1.5 text-sm font-semibold text-dark whitespace-nowrap flex-shrink-0">
        {label}
      </span>
      <span className="text-dark/25 select-none">|</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 range-dots"
      />
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={min}
          max={max}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          className="no-spin w-9 text-sm font-black italic text-blue tabular-nums text-right bg-transparent outline-none border-b border-blue/40"
        />
      ) : (
        <span
          onClick={startEdit}
          title="Click to edit"
          className="text-sm font-black italic text-dark tabular-nums flex-shrink-0 cursor-text min-w-6 text-right hover:text-blue transition-colors duration-150"
        >
          {value}
        </span>
      )}
    </div>
  );
}

// Discrete step slider — used for passphrase word count, shows exactly N dots
function StepSlider({
  label, min, max, value, onChange,
}: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="flex items-center bg-dark/5 rounded-full pl-1.5 pr-5 py-1.5 mb-4 gap-3">
      <span className="bg-light rounded-full px-4 py-1.5 text-sm font-semibold text-dark whitespace-nowrap flex-shrink-0">
        {label}
      </span>
      <span className="text-dark/25 select-none">|</span>
      <div className="flex-1 flex items-center justify-between">
        {steps.map(step => (
          <button
            key={step}
            onClick={() => onChange(step)}
            title={`${step} words`}
            className="flex-1 flex items-center justify-center h-8 cursor-pointer"
          >
            <span
              style={{
                display: 'block',
                width:  step === value ? 9 : 6,
                height: step === value ? 9 : 6,
                borderRadius: '50%',
                backgroundColor: step <= value ? '#48ACF0' : '#D1D5DB',
                transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: step === value ? '0 0 0 3px rgba(72,172,240,0.18)' : 'none',
              }}
            />
          </button>
        ))}
      </div>
      <span className="text-sm font-black italic text-dark tabular-nums flex-shrink-0 min-w-4 text-right">
        {value}
      </span>
    </div>
  );
}

function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { strength, met, score } = calcStrength(password);
  const meta = STRENGTH_META[strength];
  const ct   = crackTime(password);

  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="h-1.5 bg-dark/10 rounded-full overflow-hidden mb-2.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${meta.pct}%`, backgroundColor: meta.color }}
        />
      </div>
      <div className="flex items-center justify-between mb-3">
        {/* key triggers remount + fadeIn when strength level changes */}
        <span
          key={strength}
          className="text-xs font-black italic"
          style={{ color: meta.color, animation: 'fadeIn 0.25s ease-out' }}
        >
          {meta.label}
        </span>
        <span className="text-xs text-gray-400">{score}/{CRITERIA.length} criteria</span>
      </div>
      {ct && (
        <div className="flex items-center justify-between bg-dark/5 rounded-2xl px-4 py-2.5 mb-4">
          <span className="text-xs text-gray-400">Time to crack</span>
          <span
            key={ct.label}
            className="text-xs font-black italic"
            style={{ color: ct.color, animation: 'fadeIn 0.25s ease-out' }}
          >
            {ct.label}
          </span>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {CRITERIA.map((c, i) => (
          <div
            key={c.key}
            className="flex items-center gap-2.5"
            style={{
              animation: 'criteriaIn 0.3s ease-out both',
              animationDelay: `${i * 40}ms`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300"
              style={{ backgroundColor: met[i] ? meta.color : '#D1D5DB' }}
            />
            <span className={`text-xs transition-colors duration-300 ${met[i] ? 'text-dark font-medium' : 'text-gray-400'}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Passphrase constants ────────────────────────────────────────────────────────
const SEPARATORS: { value: string; label: string }[] = [
  { value: '-', label: '—'     },
  { value: '_', label: '_'     },
  { value: '.', label: '.'     },
  { value: ' ', label: 'space' },
  { value: '',  label: 'none'  },
];

const WORD_FORMATS: { value: WordFmt; label: string }[] = [
  { value: 'lower', label: 'lowercase' },
  { value: 'title', label: 'Capitalize' },
  { value: 'upper', label: 'UPPER'      },
  { value: 'camel', label: 'camelCase'  },
];

const WORD_COLORS = ['#48ACF0', '#23CE6B', '#FFDB4D', '#E63841'];

// ── Main component ──────────────────────────────────────────────────────────────
export default function PasswordTools() {
  const [tab, setTab] = useState<Tab>('generator');

  // Generator
  const [length, setLength]     = useState(16);
  const [opts, setOpts]         = useState({ upper: true, lower: true, number: true, symbol: true });
  const [password, setPassword] = useState('');

  // Checker
  const [checkInput, setCheckInput]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Passphrase
  const [wordCount, setWordCount] = useState(5);
  const [separator, setSeparator] = useState('-');
  const [wordFmt, setWordFmt]     = useState<WordFmt>('lower');
  const [ppWords, setPpWords]     = useState<string[]>([]);
  const [ppGenKey, setPpGenKey]   = useState(0);

  const regenerate = useCallback(() => {
    setPassword(generatePassword(length, opts));
  }, [length, opts]);
  useEffect(() => { regenerate(); }, [regenerate]);

  const regeneratePassphrase = useCallback(() => {
    setPpWords(genPassphrase(wordCount));
    setPpGenKey(k => k + 1);
  }, [wordCount]);
  useEffect(() => { regeneratePassphrase(); }, [regeneratePassphrase]);

  const toggleOpt = (key: keyof typeof opts) => {
    setOpts(prev => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && activeCount === 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const OPT_LABELS: { key: keyof typeof opts; label: string }[] = [
    { key: 'upper',  label: 'A–Z' },
    { key: 'lower',  label: 'a–z' },
    { key: 'number', label: '0–9' },
    { key: 'symbol', label: '!@#' },
  ];

  const ppFull = ppWords.map((w, i) => applyFmt(w, wordFmt, i)).join(separator);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="flex gap-1 p-1 bg-dark/5 rounded-full">
          {(['generator', 'checker', 'passphrase'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-5 py-2 rounded-full text-sm transition-all duration-150 active:scale-95',
                tab === t
                  ? 'bg-blue/15 text-blue font-black italic'
                  : 'text-gray-500 font-semibold hover:text-dark',
              ].join(' ')}
            >
              {t === 'generator' ? 'Generator' : t === 'checker' ? 'Strength' : 'Passphrase'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Generator ────────────────────────────────────────────────────────── */}
      {tab === 'generator' && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <PillSlider label="Length" min={8} max={64} value={length} onChange={setLength} />

          <div className="flex flex-wrap gap-2 mb-6">
            {OPT_LABELS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleOpt(key)}
                className={[
                  'group flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 active:scale-95',
                  opts[key]
                    ? 'bg-blue/15 text-blue'
                    : 'bg-dark/5 text-gray-500 hover:text-dark',
                ].join(' ')}
              >
                {opts[key] && (
                  <span className="relative w-3 h-3 flex-shrink-0">
                    <Check size={12} strokeWidth={3} className="absolute inset-0 transition-opacity duration-150 group-hover:opacity-0" />
                    <X     size={12} strokeWidth={3} className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                  </span>
                )}
                {label}
              </button>
            ))}
          </div>

          {password && (
            <div
              className="bg-dark/5 rounded-3xl px-5 py-3.5 flex items-center gap-3 mb-6"
              style={{ animation: 'fadeIn 0.15s ease-out' }}
            >
              <p
                key={password}
                className="font-mono text-[13px] text-dark break-all flex-1 leading-relaxed"
                style={{ animation: 'fadeIn 0.18s ease-out' }}
              >
                {password}
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={regenerate}
                  className="p-1.5 rounded-xl transition-colors duration-150 hover:bg-dark/10 cursor-pointer"
                  title="Regenerate"
                >
                  <RefreshCw size={14} className="text-gray-400" />
                </button>
                <CopyButton text={password} />
              </div>
            </div>
          )}

          <StrengthMeter password={password} />
        </div>
      )}

      {/* ── Checker ──────────────────────────────────────────────────────────── */}
      {tab === 'checker' && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bg-dark/5 rounded-3xl overflow-hidden mb-4">
            <div className="flex items-center px-5 py-4 gap-3">
              <input
                type={showPassword ? 'text' : 'password'}
                value={checkInput}
                onChange={e => setCheckInput(e.target.value)}
                placeholder="Enter a password..."
                className="flex-1 bg-transparent text-dark text-sm outline-none placeholder:text-gray-400 font-mono"
                autoComplete="new-password"
              />
              <button
                onClick={() => setShowPassword(p => !p)}
                className="flex-shrink-0 p-1.5 rounded-xl hover:bg-dark/10 transition-colors cursor-pointer"
                title={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword
                  ? <EyeOff size={14} className="text-gray-400" />
                  : <Eye    size={14} className="text-gray-400" />
                }
              </button>
            </div>
          </div>

          {checkInput ? (
            <StrengthMeter password={checkInput} />
          ) : (
            <div className="text-center py-6 text-sm text-gray-400 select-none">
              Type a password to check its strength.
            </div>
          )}
        </div>
      )}

      {/* ── Passphrase ───────────────────────────────────────────────────────── */}
      {tab === 'passphrase' && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>

          <StepSlider label="Words" min={3} max={8} value={wordCount} onChange={setWordCount} />

          {/* Separator */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2 px-1">Separator</p>
            <div className="flex flex-wrap gap-2">
              {SEPARATORS.map(({ value, label }) => (
                <button
                  key={label}
                  onClick={() => setSeparator(value)}
                  className={[
                    'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-mono font-semibold transition-all duration-150 active:scale-95',
                    separator === value
                      ? 'bg-blue/15 text-blue'
                      : 'bg-dark/5 text-gray-500 hover:text-dark',
                  ].join(' ')}
                >
                  {separator === value && <Check size={12} strokeWidth={3} className="flex-shrink-0" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-2 px-1">Format</p>
            <div className="flex flex-wrap gap-2">
              {WORD_FORMATS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setWordFmt(value)}
                  className={[
                    'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 active:scale-95',
                    wordFmt === value
                      ? 'bg-blue/15 text-blue'
                      : 'bg-dark/5 text-gray-500 hover:text-dark',
                  ].join(' ')}
                >
                  {wordFmt === value && <Check size={12} strokeWidth={3} className="flex-shrink-0" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Passphrase display */}
          {ppWords.length > 0 && (
            <div
              className="bg-dark/5 rounded-3xl px-5 py-4 mb-4"
              style={{ animation: 'fadeIn 0.15s ease-out' }}
            >
              {/* Assembled passphrase — the main focus */}
              <div className="flex items-start gap-3 mb-3">
                <p className="font-mono text-[13px] text-dark break-all flex-1 leading-relaxed">
                  {ppFull}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={regeneratePassphrase}
                    className="p-1.5 rounded-xl transition-colors duration-150 hover:bg-dark/10 cursor-pointer"
                    title="Regenerate"
                  >
                    <RefreshCw size={14} className="text-gray-400" />
                  </button>
                  <CopyButton text={ppFull} />
                </div>
              </div>

              {/* Individual word chips — staggered flip animation on regenerate */}
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-dark/5">
                {ppWords.map((word, i) => (
                  <span key={`${ppGenKey}-${i}`} className="inline-flex items-center gap-1">
                    <span
                      className="inline-flex items-center gap-1.5 bg-white rounded-full px-2.5 py-0.5"
                      style={{
                        animation: 'wordFlip 0.28s ease-out both',
                        animationDelay: `${i * 55}ms`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: WORD_COLORS[i % WORD_COLORS.length] }}
                      />
                      <span className="text-xs font-mono text-dark/70">
                        {applyFmt(word, wordFmt, i)}
                      </span>
                    </span>
                    {i < ppWords.length - 1 && separator && (
                      <span className="text-gray-300 font-mono text-xs select-none mx-0.5">
                        {separator}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Entropy */}
          <div className="flex items-center justify-between bg-dark/5 rounded-2xl px-4 py-2.5">
            <span className="text-xs text-gray-400">Entropy</span>
            <span
              className="text-xs font-black italic"
              style={{ color: passphraseEntropy(wordCount) >= 60 ? '#23CE6B' : '#FFDB4D' }}
            >
              ~{passphraseEntropy(wordCount)} bits
            </span>
          </div>

        </div>
      )}

    </div>
  );
}

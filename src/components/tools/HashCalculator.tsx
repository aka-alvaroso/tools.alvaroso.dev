import { useState, useEffect, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Copy, Check, X } from 'lucide-react';

type Tab  = 'text' | 'file';
type Algo = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';

const ALL_ALGOS: Algo[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

// ── MD5 (pure JS — Web Crypto doesn't support MD5) ────────────────────────────
function md5(input: Uint8Array): string {
  const T = Array.from({ length: 64 }, (_, i) =>
    (Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0,
  );
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const len    = input.length;
  const padLen = len % 64 < 56 ? 56 - (len % 64) : 120 - (len % 64);
  const buf    = new Uint8Array(len + padLen + 8);
  buf.set(input);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(len + padLen,     (len * 8) >>> 0,              true);
  dv.setUint32(len + padLen + 4, Math.floor(len / 0x20000000), true);

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  const rotL = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;
  const add  = (x: number, y: number) => (x + y) >>> 0;

  for (let i = 0; i < buf.length; i += 64) {
    const m = Array.from({ length: 16 }, (_, j) => dv.getUint32(i + j * 4, true));
    let [aa, bb, cc, dd] = [a, b, c, d];
    for (let j = 0; j < 64; j++) {
      let f: number, g: number;
      if      (j < 16) { f = (bb & cc) | (~bb & dd); g = j; }
      else if (j < 32) { f = (dd & bb) | (~dd & cc); g = (5 * j + 1) % 16; }
      else if (j < 48) { f = bb ^ cc ^ dd;            g = (3 * j + 5) % 16; }
      else             { f = cc ^ (bb | ~dd);         g = (7 * j) % 16; }
      const next = add(bb, rotL(add(add(add(aa, f >>> 0), T[j]), m[g]), S[j]));
      [aa, bb, cc, dd] = [dd, next, bb, cc];
    }
    [a, b, c, d] = [add(a, aa), add(b, bb), add(c, cc), add(d, dd)];
  }

  const out = new Uint8Array(16);
  const ov  = new DataView(out.buffer);
  ov.setUint32(0, a, true); ov.setUint32(4,  b, true);
  ov.setUint32(8, c, true); ov.setUint32(12, d, true);
  return Array.from(out, b => b.toString(16).padStart(2, '0')).join('');
}

// ── SHA-* via Web Crypto ───────────────────────────────────────────────────────
async function sha(algo: string, buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function computeAll(buf: ArrayBuffer, algos: Set<Algo>): Promise<Record<string, string>> {
  const entries = await Promise.all(
    [...algos].map(async algo => {
      const hash = algo === 'MD5' ? md5(new Uint8Array(buf)) : await sha(algo, buf);
      return [algo, hash] as const;
    }),
  );
  return Object.fromEntries(entries);
}


// ── Text illustration — stroke draw animation ─────────────────────────────────
function TextIllustration() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray  = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    // Double rAF: ensures initial state is painted before transition starts
    requestAnimationFrame(() => requestAnimationFrame(() => {
      path.style.transition       = 'stroke-dashoffset 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      path.style.strokeDashoffset = '0';
    }));
  }, []);

  return (
    <svg viewBox="0 0 333 47" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs">
      <path
        ref={pathRef}
        d="M2.69995 41.9193C7.86662 31.2526 20.1899 17.5319 37.2 19.9193C65.7 23.9193 -6.61726 63.7532 84.2 29.9193C109.7 20.4192 137.2 15.6913 171.7 19.9192C299.2 35.5443 308.2 18.9192 330.7 2.41922"
        stroke="#48ACF0"
        strokeWidth="6"
        strokeLinecap="round"
        style={{ strokeDasharray: '9999', strokeDashoffset: '9999' }}
      />
    </svg>
  );
}

// ── File illustration — spring-in arrows ──────────────────────────────────────
function FileIllustration() {
  return (
    <svg viewBox="0 0 391 183" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-52">
      <path
        d="M164.868 60.3473C166.487 60.6991 168.085 59.6716 168.437 58.0526L174.168 31.6679C174.52 30.0488 173.492 28.4512 171.873 28.0995C170.254 27.7477 168.657 28.7751 168.305 30.3942L163.21 53.8472L139.757 48.7525C138.138 48.4008 136.54 49.4282 136.189 51.0473C135.837 52.6664 136.864 54.264 138.483 54.6157L164.868 60.3473ZM182.506 165.416L181.964 162.465C99.1678 177.678 51.2081 168.192 26.9492 149.068C3.05751 130.233 1.31569 101.246 13.064 74.562C24.8424 47.8093 49.9042 24.2417 78.1124 17.2254C92.154 13.7328 106.969 14.3353 121.414 20.6517C135.873 26.9742 150.169 39.1144 162.982 59.0384L165.505 57.4157L168.028 55.7931C154.716 35.092 139.575 22.0447 123.817 15.1543C108.046 8.25776 91.8645 7.622 76.6641 11.4028C46.3882 18.9334 19.9815 43.9596 7.57261 72.1443C-4.86645 100.398 -3.51441 132.692 23.2346 153.779C49.6165 174.577 99.8443 183.654 183.048 168.366L182.506 165.416Z"
        fill="#48ACF0"
        style={{ animation: 'arrowIn 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      />
      <path
        d="M376.246 93.6111L374.08 91.5354L376.246 93.6111ZM253.444 62.6829C254.036 64.2304 255.771 65.005 257.318 64.4131L282.536 54.7668C284.084 54.1749 284.858 52.4405 284.266 50.893C283.674 49.3455 281.94 48.5709 280.393 49.1628L257.977 57.7373L249.402 35.3212C248.81 33.7737 247.076 32.9991 245.528 33.591C243.981 34.183 243.206 35.9173 243.798 37.4648L253.444 62.6829ZM303.246 182.111L306.167 182.797C312.767 154.685 324.066 139.996 336.869 128.901C343.371 123.266 350.241 118.57 357.357 113.409C364.42 108.287 371.618 102.777 378.412 95.6868L376.246 93.6111L374.08 91.5354C367.669 98.226 360.825 103.482 353.834 108.552C346.896 113.585 339.698 118.51 332.939 124.367C319.22 136.257 307.226 152.037 300.326 181.425L303.246 182.111ZM376.246 93.6111L378.412 95.6868C390.843 82.716 392.633 65.5912 387.714 49.6857C382.812 33.8351 371.2 18.8973 356.266 9.62491C341.285 0.322796 322.759 -3.38407 304.231 3.69127C285.746 10.7499 267.829 28.3213 253.507 60.3876L256.246 61.6111L258.986 62.8345C272.913 31.6509 289.872 15.5972 306.371 9.29649C322.827 3.01246 339.395 6.21184 353.101 14.7222C366.855 23.2624 377.524 37.0433 381.982 51.4583C386.423 65.8184 384.65 80.5062 374.08 91.5354L376.246 93.6111Z"
        fill="#48ACF0"
        style={{ opacity: 0, animation: 'arrowIn 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s forwards' }}
      />
    </svg>
  );
}

// ── Copy button ────────────────────────────────────────────────────────────────
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
      className="flex-shrink-0 p-1.5 rounded-xl transition-colors duration-150 hover:bg-dark/5 cursor-pointer"
      title="Copy to clipboard"
    >
      {copied
        ? <Check size={14} strokeWidth={3} className="text-green" />
        : <Copy size={14} className="text-gray-400" />
      }
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function HashCalculator() {
  const [tab, setTab]             = useState<Tab>('text');
  const [text, setText]           = useState('');
  const [file, setFile]           = useState<File | null>(null);
  const [algos, setAlgos]         = useState<Set<Algo>>(new Set(ALL_ALGOS));
  const [results, setResults]     = useState<Record<string, string>>({});
  const [dragging, setDragging]   = useState(false);
  const [computing, setComputing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab !== 'text') return;
    if (!text) { setResults({}); return; }
    setComputing(true);
    computeAll(new TextEncoder().encode(text).buffer, algos)
      .then(r => { setResults(r); setComputing(false); });
  }, [text, algos, tab]);

  useEffect(() => {
    if (tab !== 'file' || !file) return;
    setComputing(true);
    file.arrayBuffer()
      .then(buf => computeAll(buf, algos))
      .then(r => { setResults(r); setComputing(false); });
  }, [algos, tab, file]);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setComputing(true);
    const r = await computeAll(await f.arrayBuffer(), algos);
    setResults(r);
    setComputing(false);
  }, [algos]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const toggleAlgo = (algo: Algo) => {
    setAlgos(prev => {
      const next = new Set(prev);
      if (next.has(algo)) { if (next.size > 1) next.delete(algo); }
      else { next.add(algo); }
      return next;
    });
  };

  const toggleAll = () =>
    setAlgos(prev => prev.size === ALL_ALGOS.length ? new Set([ALL_ALGOS[0]]) : new Set(ALL_ALGOS));

  const allSelected = algos.size === ALL_ALGOS.length;
  const hasResults  = Object.keys(results).length > 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="flex gap-1 p-1 bg-dark/5 rounded-full">
          {(['text', 'file'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setResults({}); setText(''); setFile(null); }}
              className={[
                'px-6 py-2 rounded-full text-sm transition-all duration-150',
                tab === t
                  ? 'bg-blue/15 text-blue font-black italic'
                  : 'text-gray-500 font-semibold hover:text-dark',
              ].join(' ')}
            >
              {t === 'file' ? (
                <span className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                  </svg>
                  File
                </span>
              ) : 'Text Aa'}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="mb-6">
        {tab === 'text' ? (
          <div className="bg-dark/5 rounded-3xl overflow-hidden relative">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              className="w-full px-5 pt-5 pb-2 bg-transparent text-dark text-sm resize-none outline-none relative z-10"
            />
            {/* Placeholder overlay — fades out as the user types */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none transition-opacity duration-300"
              style={{ opacity: text ? 0 : 1 }}
            >
              <span className="text-base font-black italic text-blue">Type something to hash...</span>
              <TextIllustration />
            </div>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'rounded-3xl cursor-pointer transition-colors duration-200 overflow-hidden border-2 border-dashed',
              dragging ? 'bg-blue/5 border-blue/40' : 'bg-dark/5 border-transparent',
            ].join(' ')}
          >
            {file ? (
              <div className="flex items-center justify-center py-10">
                <span className="text-sm font-black italic text-dark">{file.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                {/* Text sits inside the arrows, not below them */}
                <div className="relative flex items-center justify-center">
                  <FileIllustration />
                  <span className="absolute text-sm font-black italic text-blue">Drop your file here</span>
                </div>
                <span className="text-xs text-gray-400">or <span className="underline underline-offset-2">click to browse</span></span>
              </div>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
          </div>
        )}
      </div>

      {/* Algorithm toggles */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={toggleAll}
          className={[
            'px-4 py-1.5 rounded-full text-sm transition-all duration-150',
            allSelected
              ? 'bg-dark text-light font-black italic'
              : 'bg-dark/5 text-gray-500 font-semibold hover:text-dark',
          ].join(' ')}
        >
          All
        </button>
        {ALL_ALGOS.map(algo => (
          <button
            key={algo}
            onClick={() => toggleAlgo(algo)}
            className={[
              'group flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm transition-all duration-150',
              algos.has(algo)
                ? 'bg-blue/15 text-blue font-black italic'
                : 'bg-dark/5 text-gray-500 font-semibold hover:text-dark',
            ].join(' ')}
          >
            {algos.has(algo) && (
              <span className="relative w-3 h-3 flex-shrink-0">
                <Check size={12} strokeWidth={3} className="absolute inset-0 transition-opacity duration-150 group-hover:opacity-0" />
                <X    size={12} strokeWidth={3} className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
              </span>
            )}
            {algo}
          </button>
        ))}
      </div>

      {/* Results */}
      {computing && (
        <div className="text-sm text-gray-400 py-6 text-center">Computing…</div>
      )}

      {!computing && hasResults && (
        <div className="flex flex-col gap-2" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          {ALL_ALGOS.filter(a => algos.has(a) && results[a]).map(algo => (
            <div key={algo} className="bg-dark/5 rounded-3xl px-5 py-3.5 flex items-center gap-3">
              <span className="text-xs font-black italic text-blue flex-shrink-0 w-14">
                {algo}
              </span>
              <p className="font-mono text-[12px] text-gray-500 break-all flex-1 leading-relaxed">
                {results[algo]}
              </p>
              <CopyButton text={results[algo]} />
            </div>
          ))}
        </div>
      )}

      {!computing && !hasResults && (tab === 'text' ? !text : !file) && (
        <div className="text-center py-6 text-sm text-gray-400 select-none">
          {tab === 'text' ? 'Start typing to see hashes.' : 'Drop or select a file to hash it.'}
        </div>
      )}

    </div>
  );
}

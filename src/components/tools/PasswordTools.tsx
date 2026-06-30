import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import Button from '../base/Button';
import ButtonLink from '../base/ButtonLink';

const zxcvbn = new ZxcvbnFactory({
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: { ...zxcvbnCommonPackage.dictionary, ...zxcvbnEnPackage.dictionary },
});

type Options = {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

type Strength = {
  level: string;
  segments: number;
  color: string;
};

const OPTION_LABELS: Record<keyof Options, string> = {
  uppercase: 'Uppercase',
  lowercase: 'Lowercase',
  numbers:   'Numbers',
  symbols:   'Symbols',
};

const OPTION_DISPLAY: Record<keyof Options, { chars: [string, string, string, string]; color: string }> = {
  uppercase: { chars: ['A', 'B', 'C', 'D'], color: '#48ACF0' },
  lowercase: { chars: ['a', 'b', 'c', 'd'], color: '#23CE6B' },
  numbers:   { chars: ['1', '2', '3', '4'], color: '#FFDB4D' },
  symbols:   { chars: ['!', '@', '#', '$'], color: '#E63841' },
};

const CHARS: Record<keyof Options, string> = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers:   '0123456789',
  symbols:   '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

function getStrength(score: number | null): Strength | null {
  if (score === null) return null;
  if (score === 0) return { level: 'Very weak',  segments: 1, color: '#E63841' };
  if (score === 1) return { level: 'Weak',        segments: 2, color: '#E63841' };
  if (score === 2) return { level: 'Medium',      segments: 3, color: '#FFDB4D' };
  if (score === 3) return { level: 'Strong',      segments: 4, color: '#23CE6B' };
  return                   { level: 'Very strong', segments: 4, color: '#23CE6B' };
}

export default function PasswordTools() {
  const [password, setPassword]           = useState('');
  const [length, setLength]               = useState(16);
  const [options, setOptions]             = useState<Options>({ uppercase: true, lowercase: true, numbers: true, symbols: false });
  const [score, setScore]                 = useState<number | null>(null);
  const [crackTime, setCrackTime]         = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);
  const [displayChars, setDisplayChars]   = useState<string[]>([]);
  const [isTyping, setIsTyping]           = useState(false);
  const [animKey, setAnimKey]             = useState(0);

  const strength       = getStrength(score);
  const containerRef   = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const charEls        = useRef<(HTMLSpanElement | null)[]>([]);
  const lengthCharEls  = useRef<(HTMLSpanElement | null)[]>([]);
  const lengthFirst    = useRef(true);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    gsap.from(Array.from(containerRef.current.children), {
      opacity: 0, y: 24, duration: 0.5, ease: 'power3.out', stagger: 0.08, clearProps: 'all',
    });
  }, []);

  useEffect(() => {
    if (lengthFirst.current) { lengthFirst.current = false; return; }
    const digits = String(length).split('');
    const els = lengthCharEls.current.slice(0, digits.length).filter(Boolean) as HTMLSpanElement[];
    els.forEach((el, i) => {
      gsap.killTweensOf(el);
      gsap.fromTo(el,
        { y: 8, rotateX: -90, opacity: 0 },
        { y: 0, rotateX: 0, opacity: 1, duration: 0.28, delay: i * 0.05, ease: 'back.out(1.4)', transformPerspective: 300 }
      );
    });
  }, [length]);

  useEffect(() => {
    if (animKey === 0) return;
    const els = charEls.current.slice(0, displayChars.length).filter(Boolean) as HTMLSpanElement[];
    els.forEach((el, i) => {
      gsap.fromTo(el,
        { y: 10, rotateX: -90, opacity: 0 },
        { y: 0, rotateX: 0, opacity: 1, duration: 0.28, delay: i * 0.022, ease: 'back.out(1.4)', transformPerspective: 300 }
      );
    });
  }, [animKey]);

  function toggleOption(key: keyof Options) {
    setOptions(o => ({ ...o, [key]: !o[key] }));
  }

  function checkPasswordStrength(pw: string) {
    if (pw.length === 0) { setScore(null); setCrackTime(null); return; }
    const result = zxcvbn.check(pw);
    setScore(result.score);
    setCrackTime(result.crackTimesDisplay.offlineSlowHashing1e4PerSecond);
  }

  function generatePassword() {
    const activeChars = (Object.keys(options) as (keyof Options)[])
      .filter(key => options[key])
      .map(key => CHARS[key])
      .join('');
    if (activeChars.length === 0) return;
    let pw = '';
    for (let i = 0; i < length; i++) {
      pw += activeChars[Math.floor(Math.random() * activeChars.length)];
    }
    setPassword(pw);
    setDisplayChars(pw.split(''));
    setIsTyping(false);
    setAnimKey(k => k + 1);
    checkPasswordStrength(pw);
  }

  function copyPassword() {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const showDisplay = !isTyping && displayChars.length > 0;

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center items-center">

      <div className="w-full">
        <ButtonLink href="/" variant="ghost" className="group font-bold text-dark/50 hover:text-dark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          className="group-hover:-translate-x-1 transition-transform duration-300">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          All tools
        </ButtonLink>
      </div>

      <div className="mb-10 w-full max-w-2xl">
        <h1 className="text-3xl font-black mb-2">Password Tools</h1>
        <p className="text-sm text-dark/50">
          Type a password to check its strength, or generate one with the options below.
        </p>
      </div>

      <div className="w-full max-w-2xl mb-6">
        <div
          className="relative cursor-text"
          onClick={() => { setIsTyping(true); inputRef.current?.focus(); }}
        >
          <input
            ref={inputRef}
            type="text"
            value={password}
            onChange={e => { setPassword(e.target.value); checkPasswordStrength(e.target.value); }}
            onFocus={() => setIsTyping(true)}
            onBlur={() => { setIsTyping(false); setDisplayChars(password.split('')); }}
            placeholder="Type, paste, or generate…"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            className={`w-full text-base font-bold bg-dark/5 rounded-xl px-4 py-3.5 pr-12 focus:outline-none focus:bg-dark/10 placeholder:text-dark/20 transition-colors ${
              showDisplay ? 'text-transparent' : 'text-dark'
            }`}
          />

          {showDisplay && (
            <div className="absolute inset-0 flex items-center px-4 pr-12 pointer-events-none overflow-hidden">
              {displayChars.map((char, i) => (
                <span
                  key={`${animKey}-${i}`}
                  ref={el => { charEls.current[i] = el; }}
                  className="text-base font-black text-dark"
                  style={{ display: 'inline-block' }}
                >
                  {char}
                </span>
              ))}
            </div>
          )}

          <Button
            variant="icon"
            onClick={e => { e.stopPropagation(); copyPassword(); }}
            aria-label="Copy password"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: copied ? '#23CE6B' : '#131313' }}
          >
            {copied ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            )}
          </Button>
        </div>
      </div>

      <div className="w-full max-w-2xl mb-6">
        <div className="w-full flex gap-1.5 mb-2.5">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="h-2 flex-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: strength && i < strength.segments ? strength.color : '#13131331' }}
            />
          ))}
        </div>
        <div className="w-full flex items-center justify-between">
          <p className="text-base font-bold" style={{ color: strength ? strength.color : '#13131331' }}>
            {strength ? strength.level : 'None'}
          </p>
          {crackTime && (
            <p className="text-xs tabular-nums" style={{ color: '#13131350' }}>
              {crackTime} to crack
            </p>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center bg-dark/5 rounded-2xl px-4 h-14 gap-4">
          <span className="text-sm font-semibold text-dark/40 shrink-0">Length</span>
          <input
            type="range"
            className="range-dots flex-1"
            min={8}
            max={64}
            value={length}
            onChange={e => setLength(Number(e.target.value))}
          />
          <div className="text-sm font-black tabular-nums shrink-0 w-6 flex justify-end overflow-hidden">
            {String(length).split('').map((digit, i) => (
              <span
                key={`${length}-${i}`}
                ref={el => { lengthCharEls.current[i] = el; }}
                style={{ display: 'inline-block' }}
              >
                {digit}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(options) as (keyof Options)[]).map(key => {
            const { chars, color } = OPTION_DISPLAY[key];
            const active = options[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleOption(key)}
                className={`relative flex flex-col justify-between rounded-2xl p-4 h-24 cursor-pointer select-none transition-all duration-200 text-left ${
                  active ? 'bg-light border-3 border-dark shadow-sm' : 'bg-dark/5 border-3 border-transparent'
                }`}
              >
                {active && (
                  <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-dark rounded-full flex items-center justify-center shadow-sm">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </div>
                )}
                <span className="text-xs font-semibold text-dark/40">{OPTION_LABELS[key]}</span>
                <div className="grid grid-cols-2 gap-x-1 gap-y-0 w-fit">
                  {chars.map((char, i) => (
                    <span
                      key={i}
                      className="text-2xl font-black leading-tight transition-colors duration-200"
                      style={{ color: active ? color : '#13131318' }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className='flex items-center justify-center'>
          <Button
            onClick={generatePassword}
            className="group w-2/3 py-4 tracking-wide justify-center"
            >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="group-hover:rotate-180 transition-transform duration-300">
              <path d="M21 2v6h-6"/>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}

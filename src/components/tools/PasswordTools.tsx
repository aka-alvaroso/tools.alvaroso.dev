import { useState, useRef, useEffect } from 'react';
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
  const inputRef       = useRef<HTMLInputElement>(null);
  const charEls        = useRef<(HTMLSpanElement | null)[]>([]);
  const lengthCharEls  = useRef<(HTMLSpanElement | null)[]>([]);
  const lengthFirst    = useRef(true);

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
    <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center items-center">

      <div className="w-full">
        <ButtonLink href="/" variant="ghost" className="group font-bold text-dark/50 hover:text-dark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          className="group-hover:-translate-x-1 transition-transform duration-300">
            <path d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
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
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M5 13.2592L7.58583 15.9568C8.2525 16.6523 8.58583 17.0001 9.00004 17.0001C9.41425 17.0001 9.74759 16.6523 10.4143 15.9568L19 7.00006" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M9 15C9 12.1716 9 10.7574 9.87868 9.87868C10.7574 9 12.1716 9 15 9L16 9C18.8284 9 20.2426 9 21.1213 9.87868C22 10.7574 22 12.1716 22 15V16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H15C12.1716 22 10.7574 22 9.87868 21.1213C9 20.2426 9 18.8284 9 16L9 15Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
                <path d="M16.9999 9C16.9975 6.04291 16.9528 4.51121 16.092 3.46243C15.9258 3.25989 15.7401 3.07418 15.5376 2.90796C14.4312 2 12.7875 2 9.5 2C6.21252 2 4.56878 2 3.46243 2.90796C3.25989 3.07417 3.07418 3.25989 2.90796 3.46243C2 4.56878 2 6.21252 2 9.5C2 12.7875 2 14.4312 2.90796 15.5376C3.07417 15.7401 3.25989 15.9258 3.46243 16.092C4.51121 16.9528 6.04291 16.9975 9 16.9999" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
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
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13.2592L7.58583 15.9568C8.2525 16.6523 8.58583 17.0001 9.00004 17.0001C9.41425 17.0001 9.74759 16.6523 10.4143 15.9568L19 7.00006" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"/>
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            className="group-hover:rotate-180 transition-transform duration-300">
              <path d="M20.4879 15C19.2524 18.4956 15.9187 21 12 21C7.02943 21 3 16.9706 3 12C3 7.02943 7.02943 3 12 3C15.7292 3 18.9286 5.26806 20.2941 8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
              <path d="M15 9H18C19.4142 9 20.1213 9 20.5607 8.56066C21 8.12132 21 7.41421 21 6V3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
            </svg>
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}

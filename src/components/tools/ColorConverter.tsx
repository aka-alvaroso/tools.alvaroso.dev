import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import ButtonLink from '../base/ButtonLink';

type Format = 'hex' | 'rgb' | 'hsl';

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

export default function ColorConverter() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    gsap.from(Array.from(containerRef.current.children), {
      opacity: 0, y: 24, duration: 0.5, ease: 'power3.out', stagger: 0.08, clearProps: 'all',
    });
  }, []);

  const [activeFormat, setActiveFormat] = useState<Format>('hex');
  const [hex, setHex]   = useState('48ACF0');
  const [r, setR]       = useState('72');
  const [g, setG]       = useState('172');
  const [b, setB]       = useState('240');
  const [h, setH]       = useState('204');
  const [s, setS]       = useState('85');
  const [l, setL]       = useState('61');
  const [copied, setCopied] = useState<Format | null>(null);
  
  const [previewColor, setPreviewColor] = useState('#48ACF0');

  const formats: { id: Format; label: string }[] = [
    { id: 'hex', label: 'HEX' },
    { id: 'rgb', label: 'RGB' },
    { id: 'hsl', label: 'HSL' },
  ];

  function copyValue(format: Format) {

    switch (format){
      case 'hex':
        navigator.clipboard.writeText("#"+hex)
        break
      case 'rgb':
          navigator.clipboard.writeText(`rgb(${r}, ${g}, ${b})`)
          break
      case 'hsl':
          navigator.clipboard.writeText(`hsl(${h}, ${s}%, ${l}%)`)
          break      
      }

    setCopied(format);
    setTimeout(() => setCopied(null), 1500);
  }

  useEffect(() => {
    if (activeFormat === "hex") {
      converter('hex')
      setPreviewColor("#"+hex)
    }  
    if (activeFormat === "rgb") { 
      converter('rgb')
      setPreviewColor(`rgb(${r}, ${g}, ${b})`)      
    }
    if (activeFormat === "hsl") { 
      converter('hsl')
      setPreviewColor(` hsl(${h}, ${s}%, ${l}%)`)      
    }
  }, [activeFormat, hex, r, g, b, h, s, l])

  function converter(format: Format){
    switch (format){
      case 'hex': {
        if (hex.length !== 6) break
        // RGB
        const hexR = parseInt(hex.substring(0,2), 16)
        const hexG = parseInt(hex.substring(2,4), 16)
        const hexB = parseInt(hex.substring(4,6), 16)
        setR(hexR.toString())
        setG(hexG.toString())
        setB(hexB.toString())

        // HSL
        const hexMax = Math.max(hexR, hexG, hexB)
        const hexMin = Math.min(hexR, hexG, hexB)

        if (hexMax === hexR) setH(Math.round(((hexG - hexB) / (hexMax - hexMin)) * 60).toString())
        if (hexMax === hexG) setH(Math.round((2 + (hexB - hexR) / (hexMax - hexMin)) * 60).toString())
        if (hexMax === hexB) setH(Math.round((4 + (hexR - hexG) / (hexMax - hexMin)) * 60).toString())

        const hexL = ((hexMax + hexMin) / 2) / 255
        setL(Math.round(hexL * 100).toString())
        setS(Math.round(((hexMax/255) - (hexMin/255)) / (1 - Math.abs(2 * hexL - 1)) * 100).toString())
        break
      }

      case 'rgb': {
        const rgbR = parseInt(r)
        const rgbG = parseInt(g)
        const rgbB = parseInt(b)
        const toHex = (n: number) => n.toString(16).padStart(2, '0')
        setHex(toHex(rgbR) + toHex(rgbG) + toHex(rgbB))

        const rgbMax = Math.max(rgbR, rgbG, rgbB)
        const rgbMin = Math.min(rgbR, rgbG, rgbB)

        if (rgbMax === rgbR) setH(Math.round(((rgbG - rgbB) / (rgbMax - rgbMin)) * 60).toString())
        if (rgbMax === rgbG) setH(Math.round((2 + (rgbB - rgbR) / (rgbMax - rgbMin)) * 60).toString())
        if (rgbMax === rgbB) setH(Math.round((4 + (rgbR - rgbG) / (rgbMax - rgbMin)) * 60).toString())
        const rgbL = ((rgbMax + rgbMin) / 2) / 255
        setL(Math.round(rgbL * 100).toString())
        setS(Math.round(((rgbMax/255) - (rgbMin/255)) / (1 - Math.abs(2 * rgbL - 1)) * 100).toString())
        break
      }

      case 'hsl': {
        const hslH = parseInt(h) / 360
        const hslS = parseInt(s) / 100
        const hslL = parseInt(l) / 100

        let hslR: number, hslG: number, hslB: number

        if (hslS === 0) {
          hslR = hslG = hslB = hslL
        } else {
          const q = hslL < 0.5 ? hslL * (1 + hslS) : hslL + hslS - hslL * hslS
          const p = 2 * hslL - q
          hslR = hueToRgb(p, q, hslH + 1/3)
          hslG = hueToRgb(p, q, hslH)
          hslB = hueToRgb(p, q, hslH - 1/3)
        }

        const hslRInt = Math.round(hslR * 255)
        const hslGInt = Math.round(hslG * 255)
        const hslBInt = Math.round(hslB * 255)

        setR(hslRInt.toString())
        setG(hslGInt.toString())
        setB(hslBInt.toString())

        const toHex = (n: number) => n.toString(16).padStart(2, '0')
        setHex(toHex(hslRInt) + toHex(hslGInt) + toHex(hslBInt))
        break
      }
    }

  }

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center items-center">

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
        <h1 className="text-3xl font-black mb-2">Color Converter</h1>
        <p className="text-sm text-dark/50">
          Enter a color in any format and get the equivalent in HEX, RGB, and HSL.
        </p>
      </div>

      {/* Color preview */}
      <div className="w-full max-w-2xl mb-6">
        <div
          className="w-full h-32 rounded-2xl transition-colors duration-300"
          style={{ backgroundColor: previewColor }}
        />
      </div>

      {/* Format tabs */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex gap-2 bg-dark/5 rounded-2xl p-1.5">
          {formats.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFormat(f.id)}
              className={`cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeFormat === f.id
                  ? 'bg-light text-dark '
                  : 'text-dark/40 hover:text-dark/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active input */}
      <div className="w-full max-w-2xl mb-8">
        {activeFormat === 'hex' && (
          <div className="flex items-center bg-dark/5 rounded-2xl px-4 h-14 gap-3">
            <span className="text-sm font-bold text-dark/40">#</span>
            <input
              type="text"
              value={hex}
              onChange={e => setHex(e.target.value.replace('#', ''))}
              placeholder="48ACF0"
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent text-base font-bold text-dark placeholder:text-dark/20 focus:outline-none uppercase tracking-widest"
            />
          </div>
        )}

        {activeFormat === 'rgb' && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'R', value: r, set: setR, max: 255 },
              { label: 'G', value: g, set: setG, max: 255 },
              { label: 'B', value: b, set: setB, max: 255 },
            ].map(channel => (
              <div key={channel.label} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-dark/40 px-1">{channel.label}</label>
                <div className="flex items-center bg-dark/5 rounded-2xl px-4 h-14">
                  <input
                    type="number"
                    value={channel.value}
                    onChange={e => channel.set(e.target.value)}
                    placeholder="0"
                    min={0}
                    max={channel.max}
                    className="w-full bg-transparent text-base font-bold text-dark placeholder:text-dark/20 focus:outline-none tabular-nums"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeFormat === 'hsl' && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'H', value: h, set: setH, suffix: '°', max: 360 },
              { label: 'S', value: s, set: setS, suffix: '%', max: 100 },
              { label: 'L', value: l, set: setL, suffix: '%', max: 100 },
            ].map(channel => (
              <div key={channel.label} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-dark/40 px-1">{channel.label}</label>
                <div className="flex items-center bg-dark/5 rounded-2xl px-4 h-14 gap-1">
                  <input
                    type="number"
                    value={channel.value}
                    onChange={e => channel.set(e.target.value)}
                    placeholder="0"
                    min={0}
                    max={channel.max}
                    className="flex-1 bg-transparent text-base font-bold text-dark placeholder:text-dark/20 focus:outline-none tabular-nums"
                  />
                  <span className="text-sm font-semibold text-dark/30">{channel.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output cards */}
      <div className="w-full max-w-2xl space-y-3">
        {formats.map(f => (
          <div
            key={f.id}
            className={`flex items-center justify-between bg-dark/5 rounded-2xl px-4 h-14 transition-opacity duration-200`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-dark/30 w-8">{f.label}</span>
              <span className="text-sm font-bold text-dark font-mono">
                {f.id === 'hex' ? `#${hex}` : f.id === 'rgb' ? `rgb(${r}, ${g}, ${b})` : `hsl(${h}, ${s}%, ${l}%)`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyValue(f.id)}
              className="text-dark/30 hover:text-dark transition-colors"
              aria-label={`Copy ${f.label}`}
            >
              {copied === f.id ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13.2592L7.58583 15.9568C8.2525 16.6523 8.58583 17.0001 9.00004 17.0001C9.41425 17.0001 9.74759 16.6523 10.4143 15.9568L19 7.00006" stroke="#23CE6B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 15C9 12.1716 9 10.7574 9.87868 9.87868C10.7574 9 12.1716 9 15 9L16 9C18.8284 9 20.2426 9 21.1213 9.87868C22 10.7574 22 12.1716 22 15V16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H15C12.1716 22 10.7574 22 9.87868 21.1213C9 20.2426 9 18.8284 9 16L9 15Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
                  <path d="M16.9999 9C16.9975 6.04291 16.9528 4.51121 16.092 3.46243C15.9258 3.25989 15.7401 3.07418 15.5376 2.90796C14.4312 2 12.7875 2 9.5 2C6.21252 2 4.56878 2 3.46243 2.90796C3.25989 3.07417 3.07418 3.25989 2.90796 3.46243C2 4.56878 2 6.21252 2 9.5C2 12.7875 2 14.4312 2.90796 15.5376C3.07417 15.7401 3.25989 15.9258 3.46243 16.092C4.51121 16.9528 6.04291 16.9975 9 16.9999" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

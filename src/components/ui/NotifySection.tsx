import { useState, useRef, useLayoutEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import gsap from 'gsap';

export default function NotifySection() {
  const [visible, setVisible]     = useState(false); // controls DOM presence
  const [email, setEmail]         = useState('');
  const [submitted, setSubmitted] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);

  // ── Animate in when modal mounts ──────────────────────────────────────────
  useLayoutEffect(() => {
    if (!visible || !overlayRef.current || !cardRef.current) return;

    gsap.killTweensOf([overlayRef.current, cardRef.current]);

    gsap.set(overlayRef.current, { opacity: 0 });
    gsap.set(cardRef.current,    { opacity: 0, scale: 0.86, y: 28 });

    const tl = gsap.timeline();
    tl.to(overlayRef.current, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0);
    tl.to(cardRef.current, {
      opacity: 1, scale: 1, y: 0,
      duration: 0.45, ease: 'back.out(1.8)',
    }, 0.04);
  }, [visible]);

  // ── Animate out then unmount ───────────────────────────────────────────────
  const closeModal = () => {
    if (!overlayRef.current || !cardRef.current) { setVisible(false); return; }

    gsap.killTweensOf([overlayRef.current, cardRef.current]);

    const tl = gsap.timeline({ onComplete: () => setVisible(false) });
    tl.to(cardRef.current, {
      opacity: 0, scale: 0.9, y: 16,
      duration: 0.22, ease: 'power3.in',
    }, 0);
    tl.to(overlayRef.current, { opacity: 0, duration: 0.28, ease: 'power2.in' }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      closeModal();
      setTimeout(() => { setSubmitted(false); setEmail(''); }, 300);
    }, 2000);
  };

  return (
    <>
      {/* ── CTA ── */}
      <div className="flex flex-col items-center gap-5 pt-10 pb-4">
        <p className="text-gray-400 text-base">More tools soon...</p>
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-blue/15 text-blue font-semibold text-base cursor-pointer hover:bg-blue/25 transition-colors duration-200"
        >
          Notify me
          <Bell size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Modal ── */}
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            ref={overlayRef}
            className="absolute inset-0 bg-dark/30 backdrop-blur-sm cursor-pointer"
            onClick={closeModal}
          />

          {/* Card */}
          <div
            ref={cardRef}
            className="relative bg-light rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:bg-dark/10 cursor-pointer transition-colors duration-150"
            >
              <X size={18} />
            </button>

            {submitted ? (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-12 h-12 rounded-full bg-green/15 flex items-center justify-center">
                  <Check size={22} className="text-green" strokeWidth={2.5} />
                </div>
                <p className="font-black text-xl text-dark">You're in!</p>
                <p className="text-sm text-gray-400">
                  We'll let you know when new tools arrive.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-black text-dark mb-1">Get notified</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Drop your email and we'll let you know when new tools are ready.
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-dark text-sm placeholder-gray-400 outline-none focus:border-blue focus:ring-2 focus:ring-blue/10 transition-colors duration-150"
                  />
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-dark text-light font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity duration-150"
                  >
                    Notify me
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

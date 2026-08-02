import { useState, useRef, useLayoutEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BellIcon, Cancel01Icon, CheckIcon } from '@hugeicons/core-free-icons';
import Modal from '../base/Modal';
import gsap from 'gsap';
import Button from '../base/Button';
import Input from '../base/Input';

export default function NotifySection() {
  const [visible, setVisible]     = useState(false);
  const [email, setEmail]         = useState('');
  const [submitted, setSubmitted] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!visible || !overlayRef.current || !cardRef.current) return;

    gsap.killTweensOf([overlayRef.current, cardRef.current]);
    gsap.set(overlayRef.current, { opacity: 0 });
    gsap.set(cardRef.current,    { opacity: 0, scale: 0.86, y: 28 });

    const tl = gsap.timeline();
    tl.to(overlayRef.current, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0);
    tl.to(cardRef.current, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.8)' }, 0.04);
  }, [visible]);

  const closeModal = () => {
    if (!overlayRef.current || !cardRef.current) { setVisible(false); return; }

    gsap.killTweensOf([overlayRef.current, cardRef.current]);

    const tl = gsap.timeline({ onComplete: () => setVisible(false) });
    tl.to(cardRef.current,    { opacity: 0, scale: 0.9, y: 16, duration: 0.22, ease: 'power3.in' }, 0);
    tl.to(overlayRef.current, { opacity: 0, duration: 0.28, ease: 'power2.in' }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    fetch(`https://linkkk.dev/r/ofqZygpD?email=${encodeURIComponent(email)}`, { mode: 'no-cors' }).catch(() => {});

    setSubmitted(true);
    setTimeout(() => {
      closeModal();
      setTimeout(() => { setSubmitted(false); setEmail(''); }, 300);
    }, 2000);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-5 pt-10 pb-4">
        <p className="text-gray-400 text-base">More tools soon...</p>
        <Button
          variant="secondary"
          className="bg-blue/15 text-blue hover:bg-blue/25"
          onClick={() => setVisible(true)}
        >
          Notify me
          <HugeiconsIcon icon={BellIcon} size={18} strokeWidth={2.5} />
        </Button>
      </div>

      <Modal 
        isOpen={visible}
        onClose={() => setVisible(false)}
      >
        {submitted ? (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-12 h-12 rounded-full bg-green/15 flex items-center justify-center">
                  <HugeiconsIcon icon={CheckIcon} size={22} className="text-green" strokeWidth={2.5} />
                </div>
                <p className="font-black text-xl text-dark">You're in!</p>
                <p className="text-sm text-gray-400">We'll let you know when new tools arrive.</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-black text-dark mb-1">Get notified</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Drop your email and we'll let you know when new tools are ready.
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                  <Button type="submit" className="w-full justify-center">
                    Notify me
                  </Button>
                </form>
              </>
            )}
      </Modal>
    </>
  );
}

import { useState, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BellIcon, CheckIcon } from '@hugeicons/core-free-icons';
import Modal from '../base/Modal';
import gsap from 'gsap';
import Button from '../base/Button';
import Input from '../base/Input';

export default function NotifySection() {
  const [visible, setVisible]     = useState(false);
  const [email, setEmail]         = useState('');
  const [submitted, setSubmitted] = useState(false);

  const bellRef    = useRef<HTMLSpanElement>(null);

  const handleBellHover = () => {
    if (!bellRef.current) return;
    gsap.killTweensOf(bellRef.current);
    const tl = gsap.timeline({ onComplete: () => gsap.set(bellRef.current!, { rotation: 0 }) });
    tl.to(bellRef.current, { rotation: 20,  transformOrigin: '50% 0%', duration: 0.10, ease: 'power1.out'   })
      .to(bellRef.current, { rotation: -16, transformOrigin: '50% 0%', duration: 0.10, ease: 'power1.inOut' })
      .to(bellRef.current, { rotation: 11,  transformOrigin: '50% 0%', duration: 0.09, ease: 'power1.inOut' })
      .to(bellRef.current, { rotation: -7,  transformOrigin: '50% 0%', duration: 0.08, ease: 'power1.inOut' })
      .to(bellRef.current, { rotation: 3,   transformOrigin: '50% 0%', duration: 0.07, ease: 'power1.inOut' })
      .to(bellRef.current, { rotation: 0,   transformOrigin: '50% 0%', duration: 0.07, ease: 'power1.out'   });
  };

  const closeModal = () => setVisible(false);

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
          onMouseEnter={handleBellHover}
        >
          Notify me
          <span ref={bellRef} className="inline-flex">
            <HugeiconsIcon icon={BellIcon} size={18} strokeWidth={2.5} />
          </span>
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

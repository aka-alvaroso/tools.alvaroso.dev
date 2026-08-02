import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useRef } from 'react';
import gsap from 'gsap';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary:   'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-dark text-light font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
  secondary: 'inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full font-semibold text-base cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:     'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-medium text-sm cursor-pointer hover:bg-dark/5 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
  icon:      'inline-flex items-center justify-center p-1.5 rounded-full cursor-pointer hover:bg-dark/10 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
};

const pressScale: Record<Variant, number> = {
  primary:   0.94,
  secondary: 0.94,
  ghost:     0.93,
  icon:      0.88,
};

export default function Button({ variant = 'primary', className = '', children, onMouseDown, onMouseUp, onMouseLeave, ...props }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.killTweensOf(ref.current);
    gsap.to(ref.current, { scale: pressScale[variant], duration: 0.1, ease: 'power2.in' });
    onMouseDown?.(e);
  };

  const release = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.killTweensOf(ref.current);
    gsap.to(ref.current, { scale: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.4)' });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    release(e);
    onMouseUp?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    release(e);
    onMouseLeave?.(e);
  };

  return (
    <button
      ref={ref}
      className={cn(styles[variant], className)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
}

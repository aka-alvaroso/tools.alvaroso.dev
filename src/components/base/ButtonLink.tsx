import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { useRef } from 'react';
import gsap from 'gsap';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'ghost' | 'link';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary: 'inline-flex items-center gap-1.5 font-medium text-light bg-dark rounded-full py-2 px-4 hover:opacity-80 transition-opacity duration-150',
  ghost:   'inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm hover:bg-dark/5 transition-colors duration-150',
  link:    'text-sm font-semibold underline underline-offset-4 hover:text-dark/60 transition-colors duration-150',
};

const pressScale: Record<Variant, number> = {
  primary: 0.94,
  ghost:   0.93,
  link:    0.97,
};

export default function ButtonLink({ href, variant = 'primary', className = '', children, onMouseDown, onMouseUp, onMouseLeave, ...props }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.killTweensOf(ref.current);
    gsap.to(ref.current, { scale: pressScale[variant], duration: 0.1, ease: 'power2.in' });
    onMouseDown?.(e);
  };

  const release = () => {
    gsap.killTweensOf(ref.current);
    gsap.to(ref.current, { scale: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.4)' });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLAnchorElement>) => { release(); onMouseUp?.(e); };
  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => { release(); onMouseLeave?.(e); };

  return (
    <a
      ref={ref}
      href={href}
      className={cn(styles[variant], className)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </a>
  );
}

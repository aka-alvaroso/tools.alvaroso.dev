import { useEffect, useRef, type ReactNode } from "react";
import Button from "./Button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import gsap from 'gsap';
import { cn } from '../../lib/cn';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'custom';

interface Props {
    size?: Size;
    className?: string;
    children: ReactNode;
    isOpen: boolean;
    onClose: () => void;
}

const styles: Record<Size, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    custom: ''
};

export default function Modal({ size = 'md', className = '', children, isOpen, onClose }: Props) {
    const contentRef = useRef<HTMLDivElement>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            previouslyFocusedRef.current = document.activeElement as HTMLElement;
            contentRef.current?.focus();
            gsap.fromTo(contentRef.current,
                { y: 150, scale: 0.5, opacity: 0 },
                { y: 0, scale: 1, opacity: 1, duration: 0.38, ease: 'back.out(1.4)', transformPerspective: 300 }
            );
        } else {
            previouslyFocusedRef.current?.focus();
            gsap.fromTo(contentRef.current,
                { y: 0, scale: 1, opacity: 1 },
                { y: 150, scale: 0.5, opacity: 0, duration: 0.30, transformPerspective: 300 }
            );
        }
    }, [isOpen])

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-dark/40 backdrop-blur-sm" onClick={onClose} />
            <div ref={contentRef} tabIndex={-1} className={cn('relative w-full bg-light rounded-3xl shadow-xl p-8', styles[size], className)}>
                <Button
                    variant="icon"
                    className="absolute top-4 right-4"
                    onClick={onClose}
                >
                    <HugeiconsIcon icon={Cancel01Icon} size={18} />
                </Button>
                {children}
            </div>
        </div>
    )

}

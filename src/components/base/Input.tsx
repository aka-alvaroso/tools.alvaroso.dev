import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, id, className = '', ...props }: Props) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-dark">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-3 rounded-2xl border bg-white text-dark text-sm placeholder-gray-400 outline-none transition-colors duration-150
          ${error
            ? 'border-red focus:border-red focus:ring-2 focus:ring-red/10'
            : 'border-gray-200 focus:border-blue focus:ring-2 focus:ring-blue/10'
          } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

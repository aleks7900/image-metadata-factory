import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  tooltip?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  tooltip,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-sm focus-visible:ring-[var(--color-primary)]',
    secondary:
      'bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] hover:opacity-90 border border-[var(--color-border)] focus-visible:ring-[var(--color-primary)]',
    tertiary:
      'bg-transparent hover:bg-[var(--color-surface-secondary)] text-[var(--color-text)] focus-visible:ring-[var(--color-border)]',
    danger:
      'bg-[var(--color-error)] hover:opacity-90 text-white shadow-sm focus-visible:ring-[var(--color-error)]',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      title={tooltip}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-0.5 mr-1.5 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
};

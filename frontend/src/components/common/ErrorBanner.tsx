import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-4 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error-bg)] text-[var(--color-text)] flex items-start justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--color-error)] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-error)]">
            {title}
          </h4>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {message}
          </p>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Retry
        </Button>
      )}
    </div>
  );
};

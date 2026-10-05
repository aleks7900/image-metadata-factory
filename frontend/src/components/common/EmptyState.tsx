import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-primary)] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-text-muted)] max-w-sm mb-5">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

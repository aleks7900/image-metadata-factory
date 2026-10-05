import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  count?: number;
}

export const LoadingSkeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  count = 1,
}) => {
  const variantStyles = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded h-4',
  };

  const elements = Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      className={`animate-pulse bg-[var(--color-surface-secondary)] border border-[var(--color-border-subtle)] ${variantStyles[variant]} ${className}`}
    />
  ));

  return count === 1 ? elements[0] : <div className="space-y-2">{elements}</div>;
};

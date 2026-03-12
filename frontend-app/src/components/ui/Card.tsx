import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'dark' | 'darker';
  className?: string;
}

export function Card({ children, variant = 'dark', className = '' }: CardProps): JSX.Element {
  const variantClass = variant === 'dark' ? 'card-dark' : 'card-darker';
  return <div className={`${variantClass} rounded-lg ${className}`.trim()}>{children}</div>;
}

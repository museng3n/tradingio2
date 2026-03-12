import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12" data-canonical-role="empty-state">
      {icon}
      <p className="text-gray-500 text-center">{title}</p>
      {description ? <p className="text-gray-600 text-sm">{description}</p> : null}
    </div>
  );
}

import type { JSX } from 'react';
interface StatusBadgeProps {
  label: string;
  live?: boolean;
}

export function StatusBadge({ label, live = false }: StatusBadgeProps): JSX.Element {
  return live ? (
    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
      <div className="w-1.5 h-1.5 bg-green-400 rounded-full pulse-dot" />
      {label}
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">{label}</span>
  );
}

import type { MouseEventHandler, ReactNode } from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
}

export function TabButton({ active, onClick, children }: TabButtonProps): JSX.Element {
  const activeClass = 'bg-blue-600/10 text-blue-400 font-medium';
  const inactiveClass = 'text-gray-400 hover:bg-gray-800 font-medium';

  return (
    <button className={`px-4 py-2 rounded-lg ${active ? activeClass : inactiveClass}`} onClick={onClick}>
      {children}
    </button>
  );
}

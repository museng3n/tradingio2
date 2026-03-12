import type { JSX } from 'react';
interface ToggleSwitchProps {
  checked: boolean;
  onToggle: () => void;
}

export function ToggleSwitch({ checked, onToggle }: ToggleSwitchProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-700'}`}
    >
      <div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(0)' }}
      />
    </button>
  );
}

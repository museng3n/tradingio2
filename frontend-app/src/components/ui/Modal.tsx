import type { JSX, ReactNode } from 'react';

interface ModalProps {
  visible: boolean;
  children: ReactNode;
  id?: string;
}

export function Modal({ visible, children, id }: ModalProps): JSX.Element {
  return (
    <div id={id} className={`${visible ? '' : 'hidden '}fixed inset-0 bg-black/80 flex items-center justify-center z-50`.trim()}>
      {children}
    </div>
  );
}

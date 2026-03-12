import { CANONICAL_PAGE_IDS } from '@/app/canonical-mapping';
import type { CanonicalPage } from '@/app/routes';
import type { ReactNode } from 'react';

interface PageContainerProps {
  page: CanonicalPage;
  visible: boolean;
  children: ReactNode;
}

export function PageContainer({ page, visible, children }: PageContainerProps): JSX.Element {
  return (
    <div id={CANONICAL_PAGE_IDS[page]} className={`p-8${visible ? '' : ' hidden'}`}>
      {children}
    </div>
  );
}

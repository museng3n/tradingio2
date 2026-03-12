import type { ReactNode } from 'react';

interface DataTableProps {
  headers: string[];
  children?: ReactNode;
}

export function DataTable({ headers, children }: DataTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
            {headers.map((header) => (
              <th key={header} className="pb-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

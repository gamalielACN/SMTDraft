'use client';

import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
  activeModule: string;
}

const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  employees: 'Employees',
  seats: 'Seats',
  invoices: 'Invoices',
  tickets: 'Tickets',
  'master-data': 'Master Data',
};

export function Breadcrumb({ activeModule }: BreadcrumbProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Home
          </span>
        </li>
        <li>
          <div className="flex items-center">
            <ChevronRight className="h-4 w-4 text-accenture-400 mx-1" />
            <span className="text-sm font-medium text-accenture-700">
              {moduleLabels[activeModule] || activeModule}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  );
}
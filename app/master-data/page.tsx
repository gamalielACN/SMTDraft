'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { MasterDataPage } from '@/components/master-data/master-data-page';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function MasterDataPageRoute() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeModule, setActiveModule] = useState('master-data');
  const router = useRouter();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    router.push('/');
    return null;
  }

  // Only Business Ops and Admin can access master data
  if (user?.role !== 'business_ops' && user?.role !== 'admin') {
    return (
      <AppLayout 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      >
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      activeModule={activeModule}
      onModuleChange={setActiveModule}
    >
      <MasterDataPage userRole={user!.role} />
    </AppLayout>
  );
}
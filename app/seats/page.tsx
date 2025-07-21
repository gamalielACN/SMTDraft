'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { SeatsPage } from '@/components/seats/seats-page';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function SeatsPageRoute() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeModule, setActiveModule] = useState('seats');
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

  return (
    <AppLayout 
      activeModule={activeModule}
      onModuleChange={setActiveModule}
    >
      <SeatsPage userRole={user!.role} />
    </AppLayout>
  );
}
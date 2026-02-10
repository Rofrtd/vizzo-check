'use client';

import { useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { usePathname, useRouter } from 'next/navigation';
import { PanelProvider } from '@/lib/PanelContext';
import AdminLayoutWrapper from '@/components/AdminLayoutWrapper';

const VALID_PANELS = ['admin', 'agency'] as const;
type Panel = (typeof VALID_PANELS)[number];

function PanelLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const panel = pathname?.split('/')[1] as Panel | undefined;
  const isValidPanel = panel === 'admin' || panel === 'agency';
  const basePath = isValidPanel ? `/${panel}` : '/admin';
  const panelLabel = basePath === '/admin' ? 'Admin geral' : 'Painel da Agência';

  const showSidebar = !pathname?.includes('/login') && !pathname?.includes('/register');

  // Redirect to valid panel by role when authenticated
  useEffect(() => {
    if (authLoading || !user) return;
    if (!isValidPanel) {
      router.replace('/admin/login');
      return;
    }
    if (user.role === 'agency' && panel === 'admin' && showSidebar) {
      router.replace('/agency/dashboard');
      return;
    }
    if (user.role === 'system_admin' && panel === 'agency') {
      router.replace('/admin/dashboard');
      return;
    }
  }, [user, authLoading, panel, showSidebar, isValidPanel, router]);

  const contextValue = useMemo(
    () => ({ basePath: basePath as '/admin' | '/agency', panelLabel }),
    [basePath, panelLabel]
  );

  if (!isValidPanel && !pathname?.includes('/login') && !pathname?.includes('/register')) {
    return null;
  }

  return (
    <PanelProvider basePath={contextValue.basePath} panelLabel={contextValue.panelLabel}>
      {showSidebar ? (
        <AdminLayoutWrapper>
          {children}
        </AdminLayoutWrapper>
      ) : (
        children
      )}
    </PanelProvider>
  );
}

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PanelLayoutContent>{children}</PanelLayoutContent>
    </AuthProvider>
  );
}

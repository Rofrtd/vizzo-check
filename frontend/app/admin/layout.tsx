'use client';

import { AuthProvider } from '@/lib/auth';
import { usePathname } from 'next/navigation';
import AdminLayoutWrapper from '@/components/AdminLayoutWrapper';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  
  // Don't show sidebar on login/register pages
  const showSidebar = !pathname?.includes('/login') && !pathname?.includes('/register');

  return (
    <AuthProvider>
      {showSidebar ? (
        <AdminLayoutWrapper>
          {children}
        </AdminLayoutWrapper>
      ) : (
        children
      )}
    </AuthProvider>
  )
}

'use client';

import { AuthProvider } from '@/lib/auth';

export default function PromoterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      router.push('/admin/login');
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">VizzoCheck</h1>
          <p className="text-gray-600 mb-4">Redirecting to login...</p>
          <div className="space-x-4">
            <Link href="/admin/login" className="text-blue-600 hover:text-blue-800">
              Admin Login
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/admin/register" className="text-blue-600 hover:text-blue-800">
              Register
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/promoter/login" className="text-blue-600 hover:text-blue-800">
              Promoter Login
            </Link>
          </div>
        </div>
    </div>
  );
}

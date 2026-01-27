'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  
  function handleLogout() {
    logout();
    router.push('/admin/login');
  }
  
  return (
              <button
                onClick={handleLogout}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500">Total Visits</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalVisits}</div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500">Active Promoters</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.activePromoters}</div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500">Pending Reviews</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.pendingReviews}</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 gap-4">
                <a href="/admin/visits" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Visits</div>
                  <div className="text-sm text-gray-500">View and manage visits</div>
                </a>
                <a href="/admin/promoters" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Promoters</div>
                  <div className="text-sm text-gray-500">Manage promoters</div>
                </a>
                <a href="/admin/brands" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Brands</div>
                  <div className="text-sm text-gray-500">Manage brands and products</div>
                </a>
                <a href="/admin/stores" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Stores</div>
                  <div className="text-sm text-gray-500">Manage stores</div>
                </a>
                <a href="/admin/financial" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Financial Reports</div>
                  <div className="text-sm text-gray-500">View financial data</div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalVisits: 0,
    activePromoters: 0,
    pendingReviews: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login');
    } else if (user && user.role !== 'agency_admin') {
      router.push('/promoter');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  async function loadStats() {
    try {
      const [visits, promoters] = await Promise.all([
        api.listVisits(),
        api.listPromoters()
      ]);
      
      setStats({
        totalVisits: visits.length || 0,
        activePromoters: promoters.filter((p: any) => p.active).length || 0,
        pendingReviews: visits.filter((v: any) => v.status === 'completed').length || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">VizzoCheck Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.email}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500">Total Visits</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalVisits}</div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500">Active Promoters</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.activePromoters}</div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500">Pending Reviews</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.pendingReviews}</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 gap-4">
                <a href="/admin/visits" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Visits</div>
                  <div className="text-sm text-gray-500">View and manage visits</div>
                </a>
                <a href="/admin/promoters" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Promoters</div>
                  <div className="text-sm text-gray-500">Manage promoters</div>
                </a>
                <a href="/admin/brands" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Brands</div>
                  <div className="text-sm text-gray-500">Manage brands and products</div>
                </a>
                <a href="/admin/stores" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Stores</div>
                  <div className="text-sm text-gray-500">Manage stores</div>
                </a>
                <a href="/admin/financial" className="p-4 border rounded hover:bg-gray-50">
                  <div className="font-medium">Financial Reports</div>
                  <div className="text-sm text-gray-500">View financial data</div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

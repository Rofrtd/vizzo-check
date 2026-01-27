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
    router.push('/promoter/login');
  }
  
  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
    >
      Sair
    </button>
  );
}

export default function PromoterHome() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/promoter/login');
    } else if (user && user.role !== 'promoter') {
      router.push('/admin/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadStores();
    }
  }, [user]);

  async function loadStores() {
    try {
      const data = await api.getAuthorizedStores();
      setStores(data);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">VizzoCheck</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/promoter/visits" className="text-sm text-gray-700 hover:text-gray-900">Minhas Visitas</a>
              <a href="/promoter/earnings" className="text-sm text-gray-700 hover:text-gray-900">Ganhos</a>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          <h2 className="text-2xl font-bold mb-6">Selecione uma Loja</h2>
          
          {stores.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500">Nenhuma loja autorizada disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <a
                  key={store.id}
                  href={`/promoter/store/${store.id}/brand`}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition"
                >
                  <h3 className="text-lg font-semibold">{store.chain_name}</h3>
                  <p className="text-sm text-gray-600 mt-2">{store.address}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{store.type === 'retail' ? 'Varejo' : 'Atacado'}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

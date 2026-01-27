'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function BrandSelection() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  
  const [store, setStore] = useState<any>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/promoter/login');
    } else if (user && user.role !== 'promoter') {
      router.push('/admin/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && storeId) {
      loadData();
    }
  }, [user, storeId]);

  async function loadData() {
    try {
      // Load authorized brands (this also verifies store authorization)
      const brandsData = await api.getAuthorizedBrandsForStore(storeId);
      setBrands(brandsData);
      
      // Try to load store info, but don't fail if it doesn't work
      try {
        const storeData = await api.getStore(storeId);
        setStore(storeData);
      } catch (storeError: any) {
        console.warn('Could not load store details:', storeError);
        // Store basic info from storeId - we'll show brands anyway
        setStore({ id: storeId, chain_name: 'Loja', address: '' });
      }
    } catch (error: any) {
      console.error('Failed to load brands:', error);
      const errorMessage = error.message || 'Falha ao carregar marcas';
      console.error('Error details:', errorMessage);
      alert(`Erro: ${errorMessage}`);
      router.push('/promoter');
    } finally {
      setLoading(false);
    }
  }

  function handleBrandSelect(brandId: string) {
    router.push(`/promoter/store/${storeId}/brand/${brandId}/visit`);
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

  if (!user || !store) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/promoter')}
                className="text-sm text-gray-600 hover:text-gray-900 mr-4"
              >
                ← Voltar
              </button>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">VizzoCheck</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Selecione uma Marca</h2>
            <p className="text-gray-600">
              Loja: <span className="font-semibold">{store.chain_name}</span>
            </p>
            <p className="text-sm text-gray-500">{store.address}</p>
          </div>
          
          {brands.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500">Nenhuma marca autorizada disponível para esta loja</p>
              <button
                onClick={() => router.push('/promoter')}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Voltar para lojas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => handleBrandSelect(brand.id)}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition text-left"
                >
                  <h3 className="text-lg font-semibold">{brand.name}</h3>
                  {brand.visit_frequency && (
                    <p className="text-sm text-gray-600 mt-2">
                      Frequência de visita: {brand.visit_frequency}x por período
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

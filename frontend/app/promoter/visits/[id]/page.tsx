'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function VisitDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const visitId = params.id as string;
  
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/promoter/login');
    } else if (user && user.role !== 'promoter') {
      router.push('/admin/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && visitId) {
      loadVisit();
    }
  }, [user, visitId]);

  async function loadVisit() {
    try {
      setLoading(true);
      const data = await api.getVisit(visitId);
      setVisit(data);
    } catch (error: any) {
      console.error('Failed to load visit:', error);
      alert(error.message || 'Falha ao carregar visita');
      router.push('/promoter/visits');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusBadge(status: string) {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      edited: 'bg-yellow-100 text-yellow-800'
    };
    const labels = {
      completed: 'Concluída',
      edited: 'Editada'
    };
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
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

  if (!user || !visit) {
    return null;
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/promoter/visits" className="text-blue-600 hover:text-blue-800">← Voltar para Visitas</Link>
              <h1 className="text-xl font-bold">Detalhes da Visita</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          {/* Visit Header */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {visit.brand?.name || 'Marca Desconhecida'}
                </h2>
                {getStatusBadge(visit.status)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Informações da Loja</h3>
                <p className="text-gray-900 font-medium">{visit.store?.chain_name || 'Desconhecida'}</p>
                <p className="text-sm text-gray-600 mt-1">{visit.store?.address || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Informações da Visita</h3>
                <p className="text-gray-900">Data: {formatDate(visit.timestamp)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  GPS: {visit.gps_latitude?.toFixed(6)}, {visit.gps_longitude?.toFixed(6)}
                </p>
              </div>
            </div>

            {visit.notes && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Observações da Visita</h3>
                <p className="text-gray-900">{visit.notes}</p>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Produtos ({visit.products?.length || 0})</h3>
            </div>
            
            {visit.products && visit.products.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {visit.products.map((vp: any) => (
                  <div key={vp.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {vp.product?.name || 'Produto Desconhecido'}
                        </h4>
                        {vp.product?.code && (
                          <p className="text-sm text-gray-500 mt-1">Código: {vp.product.code}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Quantidade em Estoque</p>
                        <p className="text-2xl font-bold text-gray-900">{vp.quantity}</p>
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Foto Antes</h5>
                        {vp.photo_before_url ? (
                          <img
                            src={`${API_URL}${vp.photo_before_url}`}
                            alt="Antes"
                            className="w-full h-64 object-cover rounded-lg border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-image.png';
                            }}
                          />
                        ) : (
                          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                            <p className="text-gray-400">Sem foto</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Foto Depois</h5>
                        {vp.photo_after_url ? (
                          <img
                            src={`${API_URL}${vp.photo_after_url}`}
                            alt="Depois"
                            className="w-full h-64 object-cover rounded-lg border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-image.png';
                            }}
                          />
                        ) : (
                          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                            <p className="text-gray-400">Sem foto</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {vp.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Observações</h5>
                        <p className="text-sm text-gray-600">{vp.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Nenhum produto encontrado para esta visita
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

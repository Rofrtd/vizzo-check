'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function MyVisitsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/promoter/login');
    } else if (user && user.role !== 'promoter') {
      router.push('/admin/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadVisits();
    }
  }, [user, filters]);

  async function loadVisits() {
    try {
      setLoading(true);
      const data = await api.getMyVisits();
      let filteredData = data;

      // Apply filters (inclusive dates)
      if (filters.startDate) {
        const startDateTime = filters.startDate.includes('T') ? filters.startDate : `${filters.startDate}T00:00:00`;
        filteredData = filteredData.filter((v: any) => 
          new Date(v.timestamp) >= new Date(startDateTime)
        );
      }
      if (filters.endDate) {
        const endDateTime = filters.endDate.includes('T') ? filters.endDate : `${filters.endDate}T23:59:59`;
        filteredData = filteredData.filter((v: any) => 
          new Date(v.timestamp) <= new Date(endDateTime)
        );
      }
      if (filters.status) {
        filteredData = filteredData.filter((v: any) => v.status === filters.status);
      }

      // Sort by timestamp (newest first)
      filteredData.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setVisits(filteredData);
    } catch (error) {
      console.error('Failed to load visits:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
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
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/promoter" className="text-blue-600 hover:text-blue-800">← Voltar</Link>
              <h1 className="text-xl font-bold">Minhas Visitas</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/promoter/earnings" className="text-sm text-gray-700 hover:text-gray-900">Ganhos</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data Final</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Todos</option>
                  <option value="completed">Concluída</option>
                  <option value="edited">Editada</option>
                </select>
              </div>
            </div>
            {(filters.startDate || filters.endDate || filters.status) && (
              <button
                onClick={() => setFilters({ startDate: '', endDate: '', status: '' })}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {/* Visits List */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            {visits.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Nenhuma visita encontrada</p>
                <Link href="/promoter" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                  Criar sua primeira visita →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {visits.map((visit) => (
                  <div key={visit.id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {visit.brand?.name || 'Marca Desconhecida'}
                          </h3>
                          {getStatusBadge(visit.status)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Loja:</span> {visit.store?.chain_name || 'Desconhecida'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Endereço:</span> {visit.store?.address || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Data:</span> {formatDate(visit.timestamp)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Produtos:</span> {visit.products?.length || 0}
                            </p>
                          </div>
                        </div>
                        {visit.notes && (
                          <p className="text-sm text-gray-600 mt-3">
                            <span className="font-medium">Observações:</span> {visit.notes}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <Link
                          href={`/promoter/visits/${visit.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Ver Detalhes →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {visits.length > 0 && (
            <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600">
                Total de visitas: <span className="font-semibold">{visits.length}</span>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

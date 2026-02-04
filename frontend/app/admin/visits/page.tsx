'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function VisitsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [visits, setVisits] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Default filters: first day of current month to today
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDefaultFilters = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: formatDateLocal(firstDayOfMonth),
      endDate: formatDateLocal(now),
      promoter_id: '',
      store_id: '',
      brand_id: '',
      status: ''
    };
  };

  const [filters, setFilters] = useState(getDefaultFilters());

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'agency_admin')) {
      router.push('/admin/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filters]);

  async function loadData() {
    try {
      setLoading(true);
      const [visitsData, promotersData, storesData, brandsData] = await Promise.all([
        api.listVisits(filters),
        api.listPromoters(),
        api.listStores(),
        api.listBrands()
      ]);
      
      setVisits(visitsData as any[]);
      setPromoters(promotersData as any[]);
      setStores(storesData as any[]);
      setBrands(brandsData as any[]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(getDefaultFilters());
  }

  const hasActiveFilters = filters.promoter_id || filters.store_id || filters.brand_id || filters.status;

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

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
              Visitas
            </h1>
            <p className="text-sm text-gray-500">Visualizar e gerenciar todas as visitas</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-0.5">Total de Visitas</p>
              <p className="text-2xl font-bold text-blue-600">{visits.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Filters */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 mb-6 p-3 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
            />
            <span className="text-gray-400 text-sm">até</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
            />
          </div>

          <div className="h-6 w-px bg-gray-300"></div>

          <select
            value={filters.promoter_id}
            onChange={(e) => handleFilterChange('promoter_id', e.target.value)}
            className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white min-w-[140px]"
          >
            <option value="">Todos promotores</option>
            {promoters.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filters.store_id}
            onChange={(e) => handleFilterChange('store_id', e.target.value)}
            className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white min-w-[140px]"
          >
            <option value="">Todas lojas</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.chain_name}</option>
            ))}
          </select>

          <select
            value={filters.brand_id}
            onChange={(e) => handleFilterChange('brand_id', e.target.value)}
            className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white min-w-[140px]"
          >
            <option value="">Todas marcas</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white min-w-[120px]"
          >
            <option value="">Todos status</option>
            <option value="completed">Concluída</option>
            <option value="edited">Editada</option>
          </select>

          {hasActiveFilters && (
            <>
              <div className="h-6 w-px bg-gray-300"></div>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-100 rounded-md transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Limpar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modern Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {visits.length === 0 ? (
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma visita encontrada</h3>
              <p className="text-gray-500 text-sm">Tente ajustar os filtros para encontrar visitas</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Data/Hora
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Promotor
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Loja
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Marca
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {visits.map((visit, index) => (
                  <tr 
                    key={visit.id} 
                    className="hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:shadow-sm cursor-pointer transition-all duration-150 group border-b border-gray-50 hover:border-blue-200"
                  >
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                          {new Date(visit.timestamp).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                          {new Date(visit.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const promoter = visit.promoter as any;
                          const photoUrl = promoter?.photo_url;
                          if (photoUrl) {
                            return (
                              <img 
                                src={`${API_URL}${photoUrl}`} 
                                alt={promoter?.name || 'N/D'}
                                className="w-8 h-8 rounded-full object-cover border-2 border-blue-200 group-hover:border-blue-300 group-hover:scale-110 transition-all"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            );
                          }
                          return null;
                        })()}
                        <div 
                          className={`w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 group-hover:scale-110 transition-all ${(visit.promoter as any)?.photo_url ? 'hidden' : ''}`}
                        >
                          <span className="text-xs font-semibold text-blue-700">
                            {((visit.promoter as any)?.name || 'N/D').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 group-hover:font-semibold transition-all">
                          {(visit.promoter as any)?.name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const store = visit.store as any;
                          const logoUrl = store?.logo_url;
                          if (logoUrl) {
                            return (
                              <img 
                                src={`${API_URL}${logoUrl}`} 
                                alt={store?.chain_name || 'N/D'}
                                className="w-8 h-8 object-contain border border-gray-200 rounded group-hover:border-purple-300 transition-all"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            );
                          }
                          return null;
                        })()}
                        <div 
                          className={`w-8 h-8 bg-purple-100 rounded flex items-center justify-center group-hover:bg-purple-200 transition-all ${(visit.store as any)?.logo_url ? 'hidden' : ''}`}
                        >
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-900 group-hover:text-blue-700 group-hover:font-semibold transition-all">
                          {(visit.store as any)?.chain_name || 'N/D'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const brand = visit.brand as any;
                          const logoUrl = brand?.logo_url;
                          if (logoUrl) {
                            return (
                              <img 
                                src={`${API_URL}${logoUrl}`} 
                                alt={brand?.name || 'N/D'}
                                className="w-8 h-8 object-contain border border-gray-200 rounded group-hover:border-indigo-300 transition-all"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            );
                          }
                          return null;
                        })()}
                        <div 
                          className={`w-6 h-6 bg-indigo-100 rounded flex items-center justify-center group-hover:bg-indigo-200 group-hover:scale-110 transition-all ${(visit.brand as any)?.logo_url ? 'hidden' : ''}`}
                        >
                          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-700 group-hover:font-semibold transition-all">
                          {(visit.brand as any)?.name || 'N/D'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          visit.status === 'completed' 
                            ? 'bg-green-500' 
                            : 'bg-yellow-500'
                        }`}></div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          visit.status === 'completed' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                          {visit.status === 'completed' ? 'Concluída' : 'Editada'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <Link
                        href={`/admin/visits/${visit.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200 group-hover:bg-blue-200 group-hover:text-blue-800 group-hover:shadow-sm"
                      >
                        <span>Ver</span>
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

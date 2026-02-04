'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    activePromoters: 0
  });
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [plannedVisits, setPlannedVisits] = useState<any>(null);
  const [brandsWithoutAllocations, setBrandsWithoutAllocations] = useState<any[]>([]);
  
  // Helper to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Default filters: first day of current month to today
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
    if (!authLoading && !user) {
      router.push('/admin/login');
    } else if (user && user.role !== 'agency_admin') {
      router.push('/promoter');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadOptions();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [filters]);

  async function loadOptions() {
    try {
      const [promotersData, storesData, brandsData] = await Promise.all([
        api.listPromoters(),
        api.listStores(),
        api.listBrands()
      ]);
      
      setPromoters((promotersData as any[]) || []);
      setStores((storesData as any[]) || []);
      setBrands((brandsData as any[]) || []);
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  }

  async function loadStats() {
    try {
      setLoading(true);
      const queryParams: any = {};
      if (filters.startDate) queryParams.startDate = filters.startDate;
      if (filters.endDate) queryParams.endDate = filters.endDate;
      if (filters.promoter_id) queryParams.promoter_id = filters.promoter_id;
      if (filters.store_id) queryParams.store_id = filters.store_id;
      if (filters.brand_id) queryParams.brand_id = filters.brand_id;
      if (filters.status) queryParams.status = filters.status;

      // Use filter dates for planned visits calculation
      const [visitsData, promotersData, plannedData, brandsWithoutAllocs] = await Promise.all([
        api.listVisits(queryParams),
        api.listPromoters(),
        api.getPlannedVisits(filters.startDate, filters.endDate),
        api.getBrandsWithoutAllocations()
      ]);
      
      const visits = (visitsData as any[]) || [];
      const promoters = (promotersData as any[]) || [];
      
      setVisits(visits);
      setPlannedVisits(plannedData as any);
      setBrandsWithoutAllocations(brandsWithoutAllocs as any[] || []);
      setStats({
        activePromoters: promoters.filter((p: any) => p.active).length || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
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

  // Check if filters are different from defaults (excluding dates which are always set)
  const hasActiveFilters = filters.promoter_id || filters.store_id || filters.brand_id || filters.status;

  // Process data for charts
  const chartData = useMemo(() => {
    // Visits over time (last 30 days or filtered period)
    const days = 30;
    const visitsOverTime: { date: string; visits: number }[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = visits.filter((v: any) => {
        const visitDate = new Date(v.timestamp).toISOString().split('T')[0];
        return visitDate === dateStr;
      }).length;
      
      visitsOverTime.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        visits: count
      });
    }

    // Visits by brand
    const brandMap = new Map<string, number>();
    visits.forEach((visit: any) => {
      const brandName = visit.brand?.name || 'Sem marca';
      brandMap.set(brandName, (brandMap.get(brandName) || 0) + 1);
    });
    const visitsByBrand = Array.from(brandMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    // Visits by store
    const storeMap = new Map<string, number>();
    visits.forEach((visit: any) => {
      const storeName = visit.store?.chain_name || 'Sem loja';
      storeMap.set(storeName, (storeMap.get(storeName) || 0) + 1);
    });
    const visitsByStore = Array.from(storeMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    // Visits by status
    const statusMap = new Map<string, number>();
    visits.forEach((visit: any) => {
      const status = visit.status === 'completed' ? 'Concluídas' : visit.status === 'edited' ? 'Editadas' : 'Outras';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const visitsByStatus = Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }));

    return {
      visitsOverTime,
      visitsByBrand,
      visitsByStore,
      visitsByStatus
    };
  }, [visits]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
    <>
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Painel de Controle</h2>
            <p className="text-sm text-gray-500">Visão geral das operações e métricas principais</p>
          </div>

          {/* Filters Panel - Always Visible */}
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 mb-6 p-3 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter Icon */}
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>

              {/* Date Filters */}
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

              {/* Divider */}
              <div className="h-6 w-px bg-gray-300"></div>

              {/* Promoter Filter */}
              <select
                value={filters.promoter_id}
                onChange={(e) => handleFilterChange('promoter_id', e.target.value)}
                className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white min-w-[140px]"
              >
                <option value="">Todos promotores</option>
                {promoters.map((promoter: any) => (
                  <option key={promoter.id} value={promoter.id}>
                    {promoter.name}
                  </option>
                ))}
              </select>

              {/* Store Filter */}
              <select
                value={filters.store_id}
                onChange={(e) => handleFilterChange('store_id', e.target.value)}
                className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white min-w-[140px]"
              >
                <option value="">Todas lojas</option>
                {stores.map((store: any) => (
                  <option key={store.id} value={store.id}>
                    {store.chain_name}
                  </option>
                ))}
              </select>

              {/* Brand Filter */}
              <select
                value={filters.brand_id}
                onChange={(e) => handleFilterChange('brand_id', e.target.value)}
                className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white min-w-[140px]"
              >
                <option value="">Todas marcas</option>
                {brands.map((brand: any) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white min-w-[120px]"
              >
                <option value="">Todos status</option>
                <option value="completed">Concluídas</option>
                <option value="edited">Editadas</option>
              </select>

              {/* Clear Button */}
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
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300 group">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Promotores Ativos</p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {stats.activePromoters}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Planned vs Executed Visits */}
          {plannedVisits && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Visitas Planejadas</p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                        {plannedVisits.planned}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Visitas Executadas</p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {plannedVisits.executed}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Taxa de Conclusão</p>
                      <p className={`text-4xl font-bold bg-clip-text text-transparent ${
                        plannedVisits.completion_rate >= 80 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                          : plannedVisits.completion_rate >= 60
                          ? 'bg-gradient-to-r from-yellow-600 to-orange-600'
                          : 'bg-gradient-to-r from-red-600 to-red-800'
                      }`}>
                        {plannedVisits.completion_rate.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl shadow-lg ${
                      plannedVisits.completion_rate >= 80 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : plannedVisits.completion_rate >= 60
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-br from-red-500 to-red-600'
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Alert for Pending Allocations */}
          {brandsWithoutAllocations.length > 0 && (
            <div className="mb-8">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold text-yellow-800">
                      Alocações Pendentes
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Existem <strong>{brandsWithoutAllocations.length}</strong> {brandsWithoutAllocations.length === 1 ? 'marca que precisa' : 'marcas que precisam'} de alocações mas não {brandsWithoutAllocations.length === 1 ? 'tem' : 'têm'} promotores alocados.
                      </p>
                    </div>
                    <div className="mt-4">
                      <a
                        href="/admin/allocations"
                        className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                      >
                        Ver detalhes e criar alocações →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Visits Over Time */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Visitas ao Longo do Tempo</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.visitsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Visitas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Visits by Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.visitsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.visitsByStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* More Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Visits by Brand */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Visitas por Marca</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.visitsByBrand}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Visitas" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Visits by Store */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Visitas por Loja</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.visitsByStore}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" fill="#10b981" name="Visitas" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

    </>
  );
}

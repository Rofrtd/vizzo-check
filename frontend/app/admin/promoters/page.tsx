'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function PromotersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [promoters, setPromoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    city: '',
    payment_per_visit: '',
    availability_days: [] as number[],
    brand_ids: [] as string[],
    store_ids: [] as string[],
    photo_url: ''
  });
  const [brands, setBrands] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    city: '',
    store_id: '',
    brand_id: '',
    status: ''
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'agency_admin')) {
      router.push('/admin/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    try {
      setLoading(true);
      const [promotersData, brandsData, storesData] = await Promise.all([
        api.listPromoters(),
        api.listBrands(),
        api.listStores()
      ]);
      
      setPromoters(promotersData as any[]);
      setBrands(brandsData as any[]);
      setStores(storesData as any[]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Get unique cities from promoters
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    promoters.forEach(p => {
      if (p.city) citySet.add(p.city);
    });
    return Array.from(citySet).sort();
  }, [promoters]);

  // Filter promoters
  const filteredPromoters = useMemo(() => {
    return promoters.filter(promoter => {
      if (filters.city && promoter.city !== filters.city) return false;
      if (filters.status) {
        if (filters.status === 'active' && !promoter.active) return false;
        if (filters.status === 'inactive' && promoter.active) return false;
      }
      if (filters.store_id) {
        const hasStore = promoter.stores?.some((s: any) => s.store_id === filters.store_id);
        if (!hasStore) return false;
      }
      if (filters.brand_id) {
        const hasBrand = promoter.brands?.some((b: any) => b.brand_id === filters.brand_id);
        if (!hasBrand) return false;
      }
      return true;
    });
  }, [promoters, filters]);

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      city: '',
      store_id: '',
      brand_id: '',
      status: ''
    });
  }

  const hasActiveFilters = filters.city || filters.store_id || filters.brand_id || filters.status;

  async function handleEdit(promoter: any) {
    setEditing(promoter);
    try {
      const fullPromoter = await api.getPromoter(promoter.id);
      setFormData({
        email: fullPromoter.user?.email || promoter.user?.email || '',
        password: '',
        name: fullPromoter.name || promoter.name || '',
        phone: fullPromoter.phone || promoter.phone || '',
        city: fullPromoter.city || promoter.city || '',
        payment_per_visit: fullPromoter.payment_per_visit?.toString() || promoter.payment_per_visit?.toString() || '',
        availability_days: fullPromoter.availability_days || promoter.availability_days || [],
        brand_ids: fullPromoter.brands?.map((b: any) => b.brand_id) || [],
        store_ids: fullPromoter.stores?.map((s: any) => s.store_id) || [],
        photo_url: fullPromoter.photo_url || promoter.photo_url || ''
      });
      setShowForm(true);
    } catch (error) {
      console.error('Failed to load promoter details:', error);
      setFormData({
        email: promoter.user?.email || '',
        password: '',
        name: promoter.name || '',
        phone: promoter.phone || '',
        city: promoter.city || '',
        payment_per_visit: promoter.payment_per_visit?.toString() || '',
        availability_days: promoter.availability_days || [],
        brand_ids: [],
        store_ids: [],
        photo_url: promoter.photo_url || ''
      });
      setShowForm(true);
    }
  }

  function handleNew() {
    setEditing(null);
    setPhotoFile(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      city: '',
      payment_per_visit: '',
      availability_days: [],
      brand_ids: [],
      store_ids: [],
      photo_url: ''
    });
    setShowForm(true);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Se estiver editando, fazer upload imediatamente
    if (editing) {
      try {
        setUploadingPhoto(true);
        const result = await api.uploadPromoterPhoto(file, editing.id);
        setFormData({ ...formData, photo_url: result.url });
      } catch (error: any) {
        alert(error.message || 'Erro ao enviar foto');
      } finally {
        setUploadingPhoto(false);
      }
    } else {
      // Se estiver criando, armazenar o arquivo para upload após criação
      setPhotoFile(file);
      // Criar preview temporário
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.updatePromoter(editing.id, formData);
      } else {
        // Remover photo_url do formData ao criar (foto será enviada separadamente)
        const { photo_url, ...promoterData } = formData;
        // Criar promotor primeiro
        const newPromoter = await api.createPromoter(promoterData) as any;
        
        // Se houver arquivo de foto, fazer upload após criação
        if (photoFile && newPromoter?.id) {
          try {
            setUploadingPhoto(true);
            await api.uploadPromoterPhoto(photoFile, newPromoter.id);
          } catch (uploadError: any) {
            console.error('Failed to upload photo:', uploadError);
            // Não falhar o cadastro se o upload falhar
          } finally {
            setUploadingPhoto(false);
          }
        }
      }
      setShowForm(false);
      setPhotoFile(null);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar promotor');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(promoter: any) {
    try {
      await api.togglePromoterActive(promoter.id);
      await loadData();
    } catch (error) {
      alert('Erro ao alterar status');
    }
  }

  function toggleDay(day: number) {
    setFormData(prev => ({
      ...prev,
      availability_days: prev.availability_days.includes(day)
        ? prev.availability_days.filter(d => d !== day)
        : [...prev.availability_days, day]
    }));
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

  const days = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' }
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
              Promotores
            </h1>
            <p className="text-sm text-gray-500">Gerenciar promotores e suas permissões</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-0.5">Total de Promotores</p>
              <p className="text-2xl font-bold text-blue-600">{filteredPromoters.length}</p>
            </div>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Promotor
            </button>
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

          <select
            value={filters.city}
            onChange={(e) => handleFilterChange('city', e.target.value)}
            className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white min-w-[140px]"
          >
            <option value="">Todas cidades</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <div className="h-6 w-px bg-gray-300"></div>

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
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
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
        {filteredPromoters.length === 0 ? (
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum promotor encontrado</h3>
              <p className="text-gray-500 text-sm">Tente ajustar os filtros para encontrar promotores</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Nome
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Telefone
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Cidade
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pagamento/Visita
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredPromoters.map((promoter) => (
                  <tr 
                    key={promoter.id} 
                    className="hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:shadow-sm cursor-pointer transition-all duration-150 group border-b border-gray-50"
                  >
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {promoter.photo_url ? (
                          <img 
                            src={`${API_URL}${promoter.photo_url}`} 
                            alt={promoter.name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-blue-200 group-hover:border-blue-300 group-hover:scale-110 transition-all"
                            onError={(e) => {
                              // Fallback to avatar if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 group-hover:scale-110 transition-all ${promoter.photo_url ? 'hidden' : ''}`}
                        >
                          <span className="text-xs font-semibold text-blue-700">
                            {promoter.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 group-hover:font-semibold transition-all">
                          {promoter.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                        {promoter.user?.email || 'N/D'}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                        {promoter.phone}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                        {promoter.city}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 group-hover:text-green-700 group-hover:font-semibold transition-all">
                        R$ {parseFloat(promoter.payment_per_visit || '0').toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          promoter.active 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                        }`}></div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          promoter.active 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {promoter.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(promoter)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200 group-hover:bg-blue-200 group-hover:text-blue-800 group-hover:shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleToggleActive(promoter)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                            promoter.active
                              ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-100 group-hover:bg-orange-200'
                              : 'text-green-600 hover:text-green-800 hover:bg-green-100 group-hover:bg-green-200'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {promoter.active ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            )}
                          </svg>
                          <span>{promoter.active ? 'Desativar' : 'Ativar'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editing ? 'Editar Promotor' : 'Novo Promotor'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required={!editing}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!editing}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Senha {editing && '(deixe em branco para manter a atual)'}
                  </label>
                  <input
                    type="password"
                    required={!editing}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Foto</label>
                  <div className="flex items-center gap-4">
                    {formData.photo_url && (
                      <img 
                        src={formData.photo_url.startsWith('data:') || formData.photo_url.startsWith('http') 
                          ? formData.photo_url 
                          : `${API_URL}${formData.photo_url}`} 
                        alt="Foto" 
                        className="w-20 h-20 object-cover border border-gray-300 rounded-full"
                      />
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {uploadingPhoto && <p className="text-xs text-gray-500 mt-1">Enviando...</p>}
                      {photoFile && !editing && <p className="text-xs text-green-600 mt-1">Foto será enviada após criar o promotor</p>}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cidade</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pagamento por Visita</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.payment_per_visit}
                    onChange={(e) => setFormData({ ...formData, payment_per_visit: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dias de Disponibilidade</label>
                  <div className="flex flex-wrap gap-2">
                    {days.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`px-3 py-1 rounded ${
                          formData.availability_days.includes(day.value)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marcas Autorizadas</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {brands.map(brand => (
                      <label key={brand.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={formData.brand_ids.includes(brand.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, brand_ids: [...formData.brand_ids, brand.id] });
                            } else {
                              setFormData({ ...formData, brand_ids: formData.brand_ids.filter(id => id !== brand.id) });
                            }
                          }}
                        />
                        <span>{brand.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lojas Autorizadas</label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {stores.map(store => (
                      <label key={store.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={formData.store_ids.includes(store.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, store_ids: [...formData.store_ids, store.id] });
                            } else {
                              setFormData({ ...formData, store_ids: formData.store_ids.filter(id => id !== store.id) });
                            }
                          }}
                        />
                        <span>{store.chain_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2 pt-4">
                  <button
                    type="submit"
                    disabled={saving || uploadingPhoto}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving || uploadingPhoto ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {uploadingPhoto ? 'Enviando...' : 'Salvando...'}
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

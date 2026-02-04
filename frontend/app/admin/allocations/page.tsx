'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom', fullLabel: 'Domingo' },
  { value: 1, label: 'Seg', fullLabel: 'Segunda' },
  { value: 2, label: 'Ter', fullLabel: 'Terça' },
  { value: 3, label: 'Qua', fullLabel: 'Quarta' },
  { value: 4, label: 'Qui', fullLabel: 'Quinta' },
  { value: 5, label: 'Sex', fullLabel: 'Sexta' },
  { value: 6, label: 'Sáb', fullLabel: 'Sábado' }
];

export default function AllocationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [allocations, setAllocations] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; promoter: string; brand: string; store: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [brandsWithoutAllocations, setBrandsWithoutAllocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    promoter_id: '',
    brandStoreGroups: [] as Array<{ 
      brand_id: string; 
      stores: Array<{ store_id: string; frequency_per_week: number; days_of_week: number[] }> 
    }>,
    active: true
  });
  
  // Current brand being selected (for sequential selection)
  const [currentBrandSelection, setCurrentBrandSelection] = useState<{ 
    brand_id: string; 
    stores: Array<{ store_id: string; frequency_per_week: number; days_of_week: number[] }> 
  } | null>(null);
  
  // For editing mode, keep single brand/store
  const [editingFormData, setEditingFormData] = useState({
    brand_id: '',
    store_id: '',
    frequency_per_week: 1,
    days_of_week: [] as number[],
    active: true
  });

  // Filters
  const [filters, setFilters] = useState({
    promoter_id: '',
    brand_id: '',
    store_id: ''
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
      const [allocationsData, promotersData, brandsData, storesData, brandsWithoutAllocs] = await Promise.all([
        api.getAllocations(),
        api.listPromoters(),
        api.listBrands(),
        api.listStores(),
        api.getBrandsWithoutAllocations()
      ]);
      
      setAllocations(allocationsData as any[]);
      setPromoters((promotersData as any[]).filter((p: any) => p.active));
      setBrands(brandsData as any[]);
      setStores(storesData as any[]);
      setBrandsWithoutAllocations(brandsWithoutAllocs as any[] || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter(allocation => {
      if (filters.promoter_id && allocation.promoter_id !== filters.promoter_id) return false;
      if (filters.brand_id && allocation.brand_id !== filters.brand_id) return false;
      if (filters.store_id && allocation.store_id !== filters.store_id) return false;
      return true;
    });
  }, [allocations, filters]);

  function handleNew() {
    setEditing(null);
    setSuggestions(null);
    setFormData({
      promoter_id: '',
      brandStoreGroups: [],
      active: true
    });
    setCurrentBrandSelection(null);
    setEditingFormData({
      brand_id: '',
      store_id: '',
      frequency_per_week: 1,
      days_of_week: [],
      active: true
    });
    setSuggestions(null);
    setShowForm(true);
  }

  function handleEdit(allocation: any) {
    setEditing(allocation);
    setSuggestions(null);
    setFormData({
      promoter_id: allocation.promoter_id,
      brandStoreGroups: [],
      active: true
    });
    setCurrentBrandSelection(null);
    setEditingFormData({
      brand_id: allocation.brand_id,
      store_id: allocation.store_id,
      frequency_per_week: allocation.frequency_per_week,
      days_of_week: allocation.days_of_week || [],
      active: allocation.active
    });
    setShowForm(true);
  }

  async function loadSuggestions() {
    // Suggestions only work for single brand-store combination
    if (editing) {
      if (!formData.promoter_id || !editingFormData.brand_id || !editingFormData.store_id) {
        alert('Selecione promotor, marca e loja primeiro');
        return;
      }
    } else {
      if (!formData.promoter_id || !currentBrandSelection || currentBrandSelection.stores.length !== 1) {
        alert('Sugestões disponíveis apenas para uma marca e uma loja. Selecione exatamente uma marca e uma loja.');
        return;
      }
    }

    try {
      setLoadingSuggestions(true);
      const brandId = editing ? editingFormData.brand_id : (currentBrandSelection?.brand_id || '');
      const storeId = editing ? editingFormData.store_id : (currentBrandSelection?.stores[0]?.store_id || '');
      const frequency = editing ? editingFormData.frequency_per_week : (currentBrandSelection?.stores[0]?.frequency_per_week || 1);
      
      const data = await api.getAllocationSuggestions(
        formData.promoter_id,
        brandId,
        storeId,
        frequency
      );
      setSuggestions(data);
      
      // Auto-fill suggested days (only in editing mode)
      if (editing && data.suggestedDays && data.suggestedDays.length > 0) {
        setEditingFormData({
          ...editingFormData,
          days_of_week: data.suggestedDays,
          frequency_per_week: data.suggestedDays.length
        });
      }
    } catch (error: any) {
      console.error('Failed to load suggestions:', error);
      alert(error.message || 'Erro ao carregar sugestões');
    } finally {
      setLoadingSuggestions(false);
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editing) {
        // Editing mode: single allocation
        if (!formData.promoter_id || !editingFormData.brand_id || !editingFormData.store_id) {
          alert('Preencha todos os campos obrigatórios');
          setSaving(false);
          return;
        }

        if (editingFormData.days_of_week.length === 0) {
          alert('Selecione pelo menos um dia da semana');
          setSaving(false);
          return;
        }

        if (editingFormData.days_of_week.length !== editingFormData.frequency_per_week) {
          alert(`Número de dias selecionados (${editingFormData.days_of_week.length}) deve corresponder à frequência (${editingFormData.frequency_per_week})`);
          setSaving(false);
          return;
        }

        await api.updateAllocation(editing.id, {
          days_of_week: editingFormData.days_of_week,
          frequency_per_week: editingFormData.frequency_per_week,
          active: editingFormData.active
        });
        setShowForm(false);
        await loadData();
      } else {
        // Creating mode: multiple allocations
        if (!formData.promoter_id || formData.brandStoreGroups.length === 0) {
          alert('Adicione pelo menos uma marca com suas lojas');
          setSaving(false);
          return;
        }

        // Validate each store in each group
        for (const group of formData.brandStoreGroups) {
          for (const store of group.stores) {
            if (store.days_of_week.length === 0) {
              const brand = brands.find(b => b.id === group.brand_id);
              const storeName = stores.find(s => s.id === store.store_id)?.chain_name || 'a loja';
              alert(`Selecione pelo menos um dia da semana para ${brand?.name || 'a marca'} na loja ${storeName}`);
              setSaving(false);
              return;
            }

            if (store.days_of_week.length !== store.frequency_per_week) {
              const brand = brands.find(b => b.id === group.brand_id);
              const storeName = stores.find(s => s.id === store.store_id)?.chain_name || 'a loja';
              alert(`Para ${brand?.name || 'a marca'} na loja ${storeName}: número de dias selecionados (${store.days_of_week.length}) deve corresponder à frequência (${store.frequency_per_week})`);
              setSaving(false);
              return;
            }
          }
        }

        // Check for duplicate allocations before creating (UI validation already prevents this, but double-check)
        const duplicateAllocations = getDuplicateAllocations();
        if (duplicateAllocations.length > 0) {
          // This should not happen if UI validation is working, but just in case
          setSaving(false);
          return;
        }

        // Create one allocation for each brand-store combination
        const allocationsToCreate = [];
        for (const group of formData.brandStoreGroups) {
          for (const store of group.stores) {
            allocationsToCreate.push(
              api.createAllocation({
                promoter_id: formData.promoter_id,
                brand_id: group.brand_id,
                store_id: store.store_id,
                days_of_week: store.days_of_week,
                frequency_per_week: store.frequency_per_week,
                active: formData.active
              })
            );
          }
        }
        
        await Promise.all(allocationsToCreate);
        setShowForm(false);
        await loadData();
        alert(`${allocationsToCreate.length} alocação(ões) criada(s) com sucesso!`);
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar alocação');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick(id: string) {
    const allocation = allocations.find((a: any) => a.id === id);
    if (allocation) {
      const promoter = promoters.find(p => p.id === allocation.promoter_id);
      const brand = brands.find(b => b.id === allocation.brand_id);
      const store = stores.find(s => s.id === allocation.store_id);
      setDeleteConfirm({
        id,
        promoter: promoter?.name || 'Promotor desconhecido',
        brand: brand?.name || 'Marca desconhecida',
        store: store?.chain_name || 'Loja desconhecida'
      });
    }
  }
  
  async function confirmDelete() {
    if (!deleteConfirm) return;
    
    try {
      await api.deleteAllocation(deleteConfirm.id);
      setDeleteConfirm(null);
      await loadData();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao deletar alocação');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }
  
  function cancelDelete() {
    setDeleteConfirm(null);
  }

  async function handleToggleActive(allocation: any) {
    try {
      await api.updateAllocation(allocation.id, {
        active: !allocation.active
      });
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar alocação');
    }
  }

  function formatDays(days: number[]): string {
    return days.map(day => DAYS_OF_WEEK.find(d => d.value === day)?.label).join(', ') || '-';
  }

  function getSelectedPromoter() {
    return promoters.find(p => p.id === formData.promoter_id);
  }
  
  function getAuthorizedBrands() {
    const promoter = getSelectedPromoter();
    if (!promoter) return [];
    
    // Get brand IDs that promoter is authorized for
    const authorizedBrandIds = (promoter.brands || []).map((pb: any) => pb.brand_id || pb.brands?.id);
    return brands.filter(b => authorizedBrandIds.includes(b.id));
  }
  
  function getAuthorizedStores() {
    const promoter = getSelectedPromoter();
    if (!promoter) return [];
    
    // Get store IDs that promoter is authorized for
    const authorizedStoreIds = (promoter.stores || []).map((ps: any) => ps.store_id || ps.stores?.id);
    return stores.filter(s => authorizedStoreIds.includes(s.id));
  }
  
  function getSelectedBrand(brandId?: string) {
    const id = brandId || (editing ? editingFormData.brand_id : (currentBrandSelection?.brand_id || ''));
    const brand = brands.find(b => b.id === id);
    // Ensure stores array is properly formatted
    if (brand && brand.stores) {
      return {
        ...brand,
        stores: brand.stores.map((bs: any) => ({
          store_id: bs.store_id || bs.stores?.id,
          visit_frequency: bs.visit_frequency || brand.visit_frequency || 1,
          stores: bs.stores || bs
        }))
      };
    }
    return brand;
  }
  
  function getAvailableStoresForBrand(brandId: string) {
    // Get stores that are:
    // 1. Present in the selected brand (through brand_stores)
    // 2. Authorized for the selected promoter
    const authorizedStores = getAuthorizedStores();
    const authorizedStoreIds = new Set(authorizedStores.map(s => s.id));
    
    const brand = getSelectedBrand(brandId);
    const storeIds = new Set<string>();
    
    if (brand?.stores) {
      brand.stores.forEach((bs: any) => {
        const storeId = bs.store_id || bs.stores?.id;
        // Only include stores that are both in the brand AND authorized for promoter
        if (storeId && authorizedStoreIds.has(storeId)) {
          storeIds.add(storeId);
        }
      });
    }
    
    return authorizedStores.filter(s => storeIds.has(s.id));
  }
  
  function addBrandStoreGroup() {
    if (!currentBrandSelection || !currentBrandSelection.brand_id || currentBrandSelection.stores.length === 0) {
      alert('Selecione uma marca e pelo menos uma loja antes de adicionar');
      return;
    }
    
    // Validate each store
    for (const store of currentBrandSelection.stores) {
      if (store.days_of_week.length === 0) {
        const storeName = stores.find(s => s.id === store.store_id)?.chain_name || 'a loja';
        alert(`Selecione pelo menos um dia da semana para ${storeName}`);
        return;
      }
      
      if (store.days_of_week.length !== store.frequency_per_week) {
        const storeName = stores.find(s => s.id === store.store_id)?.chain_name || 'a loja';
        alert(`Para ${storeName}: número de dias selecionados (${store.days_of_week.length}) deve corresponder à frequência (${store.frequency_per_week})`);
        return;
      }
    }
    
    // Check if brand already exists
    if (formData.brandStoreGroups.some(g => g.brand_id === currentBrandSelection.brand_id)) {
      alert('Esta marca já foi adicionada. Remova-a primeiro se quiser alterar as lojas.');
      return;
    }
    
    setFormData({
      ...formData,
      brandStoreGroups: [...formData.brandStoreGroups, { ...currentBrandSelection }]
    });
    
    // Reset current selection
    setCurrentBrandSelection(null);
    setSuggestions(null);
  }
  
  function removeBrandStoreGroup(brandId: string) {
    setFormData({
      ...formData,
      brandStoreGroups: formData.brandStoreGroups.filter(g => g.brand_id !== brandId)
    });
  }
  
  function isAllocationDuplicate(promoterId: string, brandId: string, storeId: string): boolean {
    return allocations.some((a: any) => 
      a.promoter_id === promoterId &&
      a.brand_id === brandId &&
      a.store_id === storeId
    );
  }
  
  function getDuplicateAllocations(): Array<{ brand: string; store: string; groupIndex: number; storeIndex: number }> {
    const duplicates: Array<{ brand: string; store: string; groupIndex: number; storeIndex: number }> = [];
    
    if (!formData.promoter_id) return duplicates;
    
    formData.brandStoreGroups.forEach((group, groupIdx) => {
      group.stores.forEach((store, storeIdx) => {
        if (isAllocationDuplicate(formData.promoter_id, group.brand_id, store.store_id)) {
          const brand = brands.find(b => b.id === group.brand_id);
          const storeName = stores.find(s => s.id === store.store_id)?.chain_name;
          duplicates.push({
            brand: brand?.name || 'Marca desconhecida',
            store: storeName || 'Loja desconhecida',
            groupIndex: groupIdx,
            storeIndex: storeIdx
          });
        }
      });
    });
    
    return duplicates;
  }
  
  function wouldBeDuplicate(promoterId: string, brandId: string, storeId: string): boolean {
    if (!promoterId) return false;
    return isAllocationDuplicate(promoterId, brandId, storeId);
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

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
              Alocações
            </h1>
            <p className="text-sm text-gray-500">Gerenciar alocações de promotores para marcas e lojas</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 px-4 py-2 rounded-lg border border-purple-100">
              <p className="text-xs text-gray-600 mb-0.5">Total de Alocações</p>
              <p className="text-2xl font-bold text-purple-600">{allocations.length}</p>
            </div>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Alocação
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Promotor</label>
              <select
                value={filters.promoter_id}
                onChange={(e) => setFilters({ ...filters, promoter_id: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                {promoters.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Marca</label>
              <select
                value={filters.brand_id}
                onChange={(e) => setFilters({ ...filters, brand_id: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Loja</label>
              <select
                value={filters.store_id}
                onChange={(e) => setFilters({ ...filters, store_id: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.chain_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Brands Without Allocations */}
        {brandsWithoutAllocations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Marcas Sem Alocações</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Marcas que precisam de visitas mas não têm promotores alocados
                  </p>
                </div>
                <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                  {brandsWithoutAllocations.length} {brandsWithoutAllocations.length === 1 ? 'marca' : 'marcas'}
                </div>
              </div>
              <div className="space-y-3">
                {brandsWithoutAllocations.map((brand: any) => (
                  <div key={brand.brand_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{brand.brand_name}</h4>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            {brand.visit_frequency}x/semana
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {brand.stores_count} {brand.stores_count === 1 ? 'loja' : 'lojas'} sem alocação
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {brand.stores.map((store: any) => (
                            <span key={store.store_id} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {store.store_name}
                              {store.visit_frequency && (
                                <span className="ml-1 text-gray-500">({store.visit_frequency}x/sem)</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleNew();
                          // Pre-select the first brand-store combination
                          if (brand.stores.length > 0) {
                            setTimeout(() => {
                              setCurrentBrandSelection({
                                brand_id: brand.brand_id,
                                stores: brand.stores.map((store: any) => ({
                                  store_id: store.store_id,
                                  frequency_per_week: store.visit_frequency || brand.visit_frequency || 1,
                                  days_of_week: []
                                }))
                              });
                            }, 100);
                          }
                        }}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        Criar Alocação
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Promotor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Marca
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Loja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Dias da Semana
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Frequência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-lg font-medium">Nenhuma alocação encontrada</p>
                      <p className="text-sm mt-1">Crie uma nova alocação para começar</p>
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((allocation) => (
                    <tr
                      key={allocation.id}
                      className="py-2.5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-sm cursor-pointer border-b border-gray-50 hover:border-blue-200 transition-all duration-200"
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{allocation.promoter_name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{allocation.brand_name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{allocation.store_name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDays(allocation.days_of_week)}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{allocation.frequency_per_week}x/semana</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          allocation.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {allocation.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(allocation);
                            }}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(allocation);
                            }}
                            className={`px-2 py-1 rounded transition-colors ${
                              allocation.active
                                ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50'
                                : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                            }`}
                          >
                            {allocation.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(allocation.id);
                            }}
                            className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Deletar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editing ? 'Editar Alocação' : 'Nova Alocação'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Promotor *</label>
                  <select
                    required
                    value={formData.promoter_id}
                    onChange={(e) => setFormData({ ...formData, promoter_id: e.target.value })}
                    disabled={!!editing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecione um promotor</option>
                    {promoters.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {editing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                      <select
                        required
                        value={editingFormData.brand_id}
                        onChange={(e) => {
                          setEditingFormData({
                            ...editingFormData,
                            brand_id: e.target.value,
                            store_id: '',
                            frequency_per_week: 1,
                            days_of_week: []
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Selecione uma marca</option>
                        {getAuthorizedBrands().map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      {formData.promoter_id && getAuthorizedBrands().length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Este promotor não possui marcas autorizadas
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loja *</label>
                      <select
                        required
                        value={editingFormData.store_id}
                        onChange={(e) => {
                          const storeId = e.target.value;
                          const brand = getSelectedBrand(editingFormData.brand_id);
                          let frequency = 1;
                          
                          if (brand && storeId) {
                            const brandStore = brand.stores?.find((bs: any) => 
                              (bs.store_id || bs.stores?.id) === storeId
                            );
                            frequency = brandStore?.visit_frequency || brand.visit_frequency || 1;
                          }
                          
                          setEditingFormData({ 
                            ...editingFormData, 
                            store_id: storeId, 
                            frequency_per_week: frequency,
                            days_of_week: [] 
                          });
                        }}
                        disabled={!editingFormData.brand_id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      >
                        <option value="">Selecione uma loja</option>
                        {editingFormData.brand_id ? (
                          (() => {
                            const brand = getSelectedBrand(editingFormData.brand_id);
                            const brandStoreIds = brand?.stores?.map((bs: any) => bs.store_id || bs.stores?.id) || [];
                            const authorizedStores = getAuthorizedStores();
                            return authorizedStores
                              .filter(s => brandStoreIds.includes(s.id))
                              .map(s => (
                                <option key={s.id} value={s.id}>{s.chain_name}</option>
                              ));
                          })()
                        ) : (
                          getAuthorizedStores().map(s => (
                            <option key={s.id} value={s.id}>{s.chain_name}</option>
                          ))
                        )}
                      </select>
                      {formData.promoter_id && getAuthorizedStores().length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Este promotor não possui lojas autorizadas
                        </p>
                      )}
                      {editingFormData.brand_id && editingFormData.store_id && (() => {
                        const brand = getSelectedBrand(editingFormData.brand_id);
                        const brandStore = brand?.stores?.find((bs: any) => 
                          (bs.store_id || bs.stores?.id) === editingFormData.store_id
                        );
                        const frequency = brandStore?.visit_frequency || brand?.visit_frequency || 1;
                        return (
                          <p className="text-xs text-gray-500 mt-1">
                            Frequência para esta marca nesta loja: {frequency}x/semana
                          </p>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Grupos já adicionados */}
                    {formData.brandStoreGroups.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Marcas e Lojas Adicionadas
                        </label>
                        <div className="space-y-2 mb-4">
                          {formData.brandStoreGroups.map((group, idx) => {
                            const brand = brands.find(b => b.id === group.brand_id);
                            const groupDuplicates = getDuplicateAllocations().filter(d => d.groupIndex === idx);
                            const hasDuplicates = groupDuplicates.length > 0;
                            
                            return (
                              <div key={idx} className={`p-3 rounded-lg border-2 ${hasDuplicates ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className={`font-semibold ${hasDuplicates ? 'text-red-900' : 'text-blue-900'}`}>
                                        {brand?.name || 'Marca não encontrada'}
                                      </p>
                                      {hasDuplicates && (
                                        <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-semibold rounded">
                                          Duplicata
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-2 space-y-1">
                                      {group.stores.map((store, storeIdx) => {
                                        const storeData = stores.find(s => s.id === store.store_id);
                                        const isDuplicate = groupDuplicates.some(d => d.storeIndex === storeIdx);
                                        return (
                                          <div key={storeIdx} className="flex items-center gap-2">
                                            <p className={`text-sm ${isDuplicate ? 'text-red-700 font-semibold' : 'text-blue-700'}`}>
                                              {storeData?.chain_name || 'Loja não encontrada'}: {store.frequency_per_week}x/semana - {formatDays(store.days_of_week)}
                                            </p>
                                            {isDuplicate && (
                                              <span className="text-xs text-red-600 font-semibold">⚠️ Já existe</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {hasDuplicates && (
                                      <p className="text-xs text-red-600 mt-2 font-medium">
                                        ⚠️ Esta alocação já existe. Remova antes de salvar.
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeBrandStoreGroup(group.brand_id)}
                                    className="ml-2 text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Seleção de nova marca e lojas */}
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        {formData.brandStoreGroups.length > 0 ? 'Adicionar Outra Marca' : 'Selecione Marca e Lojas'}
                      </h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                        <select
                          value={currentBrandSelection?.brand_id || ''}
                          onChange={(e) => {
                            const brandId = e.target.value;
                            if (brandId) {
                              setCurrentBrandSelection({
                                brand_id: brandId,
                                stores: []
                              });
                              setSuggestions(null); // Clear suggestions when brand changes
                            } else {
                              setCurrentBrandSelection(null);
                              setSuggestions(null);
                            }
                          }}
                          disabled={!formData.promoter_id}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                        >
                          <option value="">Selecione uma marca</option>
                          {formData.promoter_id ? (
                            getAuthorizedBrands()
                              .filter(b => !formData.brandStoreGroups.some(g => g.brand_id === b.id))
                              .map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))
                          ) : (
                            <option disabled>Selecione um promotor primeiro</option>
                          )}
                        </select>
                        {formData.promoter_id && getAuthorizedBrands().filter(b => !formData.brandStoreGroups.some(g => g.brand_id === b.id)).length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Todas as marcas autorizadas já foram adicionadas
                          </p>
                        )}
                      </div>

                      {currentBrandSelection?.brand_id && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lojas para {brands.find(b => b.id === currentBrandSelection.brand_id)?.name} *
                          </label>
                          <div className="border rounded p-2 space-y-3">
                            {getAvailableStoresForBrand(currentBrandSelection.brand_id).map(store => {
                              const storeConfig = currentBrandSelection.stores.find(s => s.store_id === store.id);
                              const isSelected = !!storeConfig;
                              const isDuplicate = wouldBeDuplicate(formData.promoter_id, currentBrandSelection.brand_id, store.id);
                              
                              return (
                                <div key={store.id} className={`border rounded-lg overflow-hidden ${isDuplicate ? 'border-red-300 bg-red-50/30' : ''}`}>
                                  <label className={`flex items-center gap-2 p-2.5 ${isDuplicate ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'} bg-gray-50/50`}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={isDuplicate}
                                      onChange={(e) => {
                                        if (e.target.checked && !isDuplicate) {
                                          // Get default frequency for this brand-store combination
                                          const brand = getSelectedBrand(currentBrandSelection.brand_id);
                                          const brandStore = brand?.stores?.find((bs: any) => 
                                            (bs.store_id || bs.stores?.id) === store.id
                                          );
                                          const defaultFreq = brandStore?.visit_frequency || brand?.visit_frequency || 1;
                                          
                                          setCurrentBrandSelection({
                                            ...currentBrandSelection,
                                            stores: [...currentBrandSelection.stores, {
                                              store_id: store.id,
                                              frequency_per_week: defaultFreq,
                                              days_of_week: []
                                            }]
                                          });
                                        } else if (!isDuplicate) {
                                          setCurrentBrandSelection({
                                            ...currentBrandSelection,
                                            stores: currentBrandSelection.stores.filter(s => s.store_id !== store.id)
                                          });
                                        }
                                      }}
                                      className="rounded"
                                    />
                                    <span className="flex-1 font-medium text-gray-900">{store.chain_name}</span>
                                    {isDuplicate && (
                                      <span className="text-xs text-red-600 font-semibold px-2 py-0.5 bg-red-100 rounded">
                                        ⚠️ Já alocada
                                      </span>
                                    )}
                                  </label>
                                  
                                  {isSelected && storeConfig && (
                                    <div className="p-3 bg-white space-y-2.5 border-t">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Frequência para {store.chain_name} *
                                        </label>
                                        <input
                                          type="number"
                                          required
                                          min={1}
                                          max={7}
                                          value={storeConfig.frequency_per_week}
                                          onChange={(e) => {
                                            const freq = parseInt(e.target.value) || 1;
                                            setCurrentBrandSelection({
                                              ...currentBrandSelection,
                                              stores: currentBrandSelection.stores.map(s =>
                                                s.store_id === store.id
                                                  ? { ...s, frequency_per_week: freq, days_of_week: s.days_of_week.slice(0, freq) }
                                                  : s
                                              )
                                            });
                                          }}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                        />
                                      </div>

                                      <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <label className="block text-xs font-medium text-gray-700">
                                            Dias para {store.chain_name} *
                                          </label>
                                          {formData.promoter_id && currentBrandSelection.stores.length === 1 && (
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                // Load suggestions for this specific store
                                                try {
                                                  setLoadingSuggestions(true);
                                                  const frequency = storeConfig.frequency_per_week;
                                                  
                                                  const data = await api.getAllocationSuggestions(
                                                    formData.promoter_id,
                                                    currentBrandSelection.brand_id,
                                                    store.id,
                                                    frequency
                                                  );
                                                  setSuggestions(data);
                                                  
                                                  // Apply suggestions to this store
                                                  if (data.suggestedDays && data.suggestedDays.length > 0) {
                                                    setCurrentBrandSelection(prev => {
                                                      if (!prev) return prev;
                                                      return {
                                                        ...prev,
                                                        stores: prev.stores.map(s => {
                                                          if (s.store_id === store.id) {
                                                            return { ...s, days_of_week: data.suggestedDays.slice(0, s.frequency_per_week) };
                                                          }
                                                          return s;
                                                        })
                                                      };
                                                    });
                                                  }
                                                } catch (error: any) {
                                                  console.error('Failed to load suggestions:', error);
                                                  alert(error.message || 'Erro ao carregar sugestões');
                                                } finally {
                                                  setLoadingSuggestions(false);
                                                }
                                              }}
                                              disabled={loadingSuggestions}
                                              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                                            >
                                              {loadingSuggestions ? 'Carregando...' : '💡 Sugerir Dias'}
                                            </button>
                                          )}
                                        </div>
                                        
                                        {suggestions && suggestions.conflictingAllocations.length > 0 && currentBrandSelection.stores.length === 1 && (
                                          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                            <p className="font-semibold">Aviso: Conflitos detectados</p>
                                            <p>Este promotor já está alocado para outras marcas nos seguintes dias:</p>
                                            <ul className="list-disc list-inside mt-1">
                                              {suggestions.conflictingAllocations.map((conflict: any, idx: number) => (
                                                <li key={idx}>
                                                  {conflict.brand_name}: {formatDays(conflict.days)}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        <div className="grid grid-cols-7 gap-1">
                                          {DAYS_OF_WEEK.map(day => {
                                            const promoter = getSelectedPromoter();
                                            const isAvailable = promoter?.availability_days?.includes(day.value) ?? true;
                                            const isSelected = storeConfig.days_of_week.includes(day.value);
                                            const isConflicting = suggestions?.conflictingAllocations?.some((c: any) => 
                                              c.days.includes(day.value)
                                            ) ?? false;

                                            return (
                                              <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => {
                                                  setCurrentBrandSelection(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                      ...prev,
                                                      stores: prev.stores.map(s => {
                                                        if (s.store_id === store.id) {
                                                          const newDays = s.days_of_week.includes(day.value)
                                                            ? s.days_of_week.filter(d => d !== day.value)
                                                            : [...s.days_of_week, day.value].slice(0, s.frequency_per_week);
                                                          return { ...s, days_of_week: newDays };
                                                        }
                                                        return s;
                                                      })
                                                    };
                                                  });
                                                }}
                                                disabled={!isAvailable}
                                                className={`
                                                  px-1.5 py-1 rounded text-xs font-medium transition-all
                                                  ${isSelected
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : isAvailable
                                                      ? isConflicting
                                                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400 hover:bg-yellow-200'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                  }
                                                `}
                                                title={day.fullLabel + (isAvailable ? '' : ' (Indisponível)')}
                                              >
                                                {day.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                        {storeConfig.days_of_week.length > 0 && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            {formatDays(storeConfig.days_of_week)} ({storeConfig.days_of_week.length} dia{storeConfig.days_of_week.length !== 1 ? 's' : ''})
                                          </p>
                                        )}
                                        {storeConfig.days_of_week.length !== storeConfig.frequency_per_week && storeConfig.days_of_week.length > 0 && (
                                          <p className="text-xs text-red-600 mt-0.5">
                                            ⚠️ Dias ({storeConfig.days_of_week.length}) ≠ frequência ({storeConfig.frequency_per_week})
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {getAvailableStoresForBrand(currentBrandSelection.brand_id).length === 0 && (
                              <p className="text-sm text-gray-500 text-center py-2">
                                Nenhuma loja disponível para esta marca
                              </p>
                            )}
                          </div>
                          
                          {currentBrandSelection.stores.length > 0 && (
                            <>
                              {currentBrandSelection.stores.some(s => 
                                wouldBeDuplicate(formData.promoter_id, currentBrandSelection.brand_id, s.store_id)
                              ) && (
                                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                                  <p className="font-semibold">⚠️ Aviso: Algumas lojas já estão alocadas</p>
                                  <p className="mt-1">Remova as lojas marcadas como "Já alocada" antes de adicionar.</p>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={addBrandStoreGroup}
                                disabled={
                                  currentBrandSelection.stores.some(s => 
                                    s.days_of_week.length === 0 || 
                                    s.days_of_week.length !== s.frequency_per_week ||
                                    wouldBeDuplicate(formData.promoter_id, currentBrandSelection.brand_id, s.store_id)
                                  )
                                }
                                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                + Adicionar {brands.find(b => b.id === currentBrandSelection.brand_id)?.name} com {currentBrandSelection.stores.length} loja(s)
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {formData.brandStoreGroups.length > 0 && (
                        <div className="mt-3">
                          {getDuplicateAllocations().length > 0 && (
                            <div className="mb-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                              <p className="text-sm font-semibold text-red-900 mb-1">
                                ⚠️ Não é possível salvar: Existem alocações duplicadas
                              </p>
                              <p className="text-xs text-red-700">
                                Remova as alocações marcadas em vermelho antes de salvar.
                              </p>
                            </div>
                          )}
                          <p className={`text-xs mt-2 ${getDuplicateAllocations().length > 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            Total: {formData.brandStoreGroups.reduce((sum, g) => sum + g.stores.length, 0)} alocação(ões) serão criadas
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {editing && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frequência por Semana *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={7}
                        value={editingFormData.frequency_per_week}
                        onChange={(e) => {
                          const freq = parseInt(e.target.value) || 1;
                          setEditingFormData({
                            ...editingFormData,
                            frequency_per_week: freq,
                            days_of_week: editingFormData.days_of_week.slice(0, freq)
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Dias da Semana *</label>
                        {formData.promoter_id && editingFormData.brand_id && editingFormData.store_id && (
                          <button
                            type="button"
                            onClick={loadSuggestions}
                            disabled={loadingSuggestions}
                            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                          >
                            {loadingSuggestions ? 'Carregando...' : '💡 Sugerir Dias'}
                          </button>
                        )}
                      </div>
                  
                  {suggestions && suggestions.conflictingAllocations.length > 0 && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <p className="font-semibold">Aviso: Conflitos detectados</p>
                      <p>Este promotor já está alocado para outras marcas nos seguintes dias:</p>
                      <ul className="list-disc list-inside mt-1">
                        {suggestions.conflictingAllocations.map((conflict: any, idx: number) => (
                          <li key={idx}>
                            {conflict.brand_name}: {formatDays(conflict.days)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      const promoter = getSelectedPromoter();
                      const isAvailable = promoter?.availability_days?.includes(day.value) ?? true;
                      const isSelected = editingFormData.days_of_week.includes(day.value);
                      const isConflicting = suggestions?.conflictingAllocations?.some((c: any) => 
                        c.days.includes(day.value)
                      ) ?? false;

                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            setEditingFormData(prev => ({
                              ...prev,
                              days_of_week: prev.days_of_week.includes(day.value)
                                ? prev.days_of_week.filter(d => d !== day.value)
                                : [...prev.days_of_week, day.value].slice(0, prev.frequency_per_week)
                            }));
                          }}
                          disabled={!isAvailable}
                          className={`
                            px-3 py-2 rounded-md text-sm font-medium transition-all
                            ${isSelected
                              ? 'bg-blue-600 text-white shadow-md'
                              : isAvailable
                                ? isConflicting
                                  ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400 hover:bg-yellow-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }
                          `}
                          title={day.fullLabel + (isAvailable ? '' : ' (Indisponível)')}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  {editingFormData.days_of_week.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Dias selecionados: {formatDays(editingFormData.days_of_week)} ({editingFormData.days_of_week.length} dia{editingFormData.days_of_week.length !== 1 ? 's' : ''})
                    </p>
                  )}
                  {editingFormData.days_of_week.length !== editingFormData.frequency_per_week && editingFormData.days_of_week.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Número de dias selecionados ({editingFormData.days_of_week.length}) não corresponde à frequência ({editingFormData.frequency_per_week})
                    </p>
                  )}
                </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editing ? editingFormData.active : formData.active}
                    onChange={(e) => {
                      if (editing) {
                        setEditingFormData({ ...editingFormData, active: e.target.checked });
                      } else {
                        setFormData({ ...formData, active: e.target.checked });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">Ativo</label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    type="submit"
                    disabled={saving || (!editing && getDuplicateAllocations().length > 0)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Salvando...
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

      {/* Modal de Confirmação de Deleção */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                Tem certeza que deseja deletar esta alocação?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Promotor:</span> {deleteConfirm.promoter}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Marca:</span> {deleteConfirm.brand}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Loja:</span> {deleteConfirm.store}
                </p>
              </div>
              <p className="text-xs text-red-600 text-center mb-4">
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Deletar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de Erro */}
      {errorMessage && (
        <div className="fixed top-4 right-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Erro</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

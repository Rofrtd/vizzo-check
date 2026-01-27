'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

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
    store_ids: [] as string[]
  });
  const [brands, setBrands] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

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
      
      setPromoters(promotersData);
      setBrands(brandsData);
      setStores(storesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

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
        store_ids: fullPromoter.stores?.map((s: any) => s.store_id) || []
      });
      setShowForm(true);
    } catch (error) {
      console.error('Failed to load promoter details:', error);
      // Fallback to basic data
      setFormData({
        email: promoter.user?.email || '',
        password: '',
        name: promoter.name || '',
        phone: promoter.phone || '',
        city: promoter.city || '',
        payment_per_visit: promoter.payment_per_visit?.toString() || '',
        availability_days: promoter.availability_days || [],
        brand_ids: [],
        store_ids: []
      });
      setShowForm(true);
    }
  }

  function handleNew() {
    setEditing(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      city: '',
      payment_per_visit: '',
      availability_days: [],
      brand_ids: [],
      store_ids: []
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.updatePromoter(editing.id, formData);
      } else {
        await api.createPromoter(formData);
      }
      setShowForm(false);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save promoter');
    }
  }

  async function handleToggleActive(promoter: any) {
    try {
      await api.togglePromoterActive(promoter.id);
      await loadData();
    } catch (error) {
      alert('Failed to toggle active status');
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
    return <div className="p-8">Loading...</div>;
  }

  const days = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/admin/dashboard" className="text-blue-600">← Dashboard</a>
              <h1 className="text-xl font-bold">Promoters</h1>
            </div>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              New Promoter
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">
                    {editing ? 'Edit Promoter' : 'New Promoter'}
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
                        Password {editing && '(leave blank to keep current)'}
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
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment per Visit</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Availability Days</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Authorized Brands</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Authorized Stores</label>
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
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Promoters Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment/Visit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promoters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No promoters found
                    </td>
                  </tr>
                ) : (
                  promoters.map((promoter) => (
                    <tr key={promoter.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {promoter.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {promoter.user?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {promoter.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {promoter.city}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${promoter.payment_per_visit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          promoter.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {promoter.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(promoter)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(promoter)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {promoter.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

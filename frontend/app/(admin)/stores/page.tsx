'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function StoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    chain_name: '',
    type: 'retail' as 'retail' | 'wholesale',
    address: '',
    gps_latitude: '',
    gps_longitude: '',
    radius_meters: '50',
    shelf_layout_pdf_url: '',
    product_category: '',
    contacts: [] as Array<{ name: string; phone: string; role: string }>
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
      const storesData = await api.listStores();
      setStores(storesData);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStoreDetails(id: string) {
    try {
      const store = await api.getStore(id);
      setFormData({
        chain_name: store.chain_name || '',
        type: store.type || 'retail',
        address: store.address || '',
        gps_latitude: store.gps_latitude?.toString() || '',
        gps_longitude: store.gps_longitude?.toString() || '',
        radius_meters: store.radius_meters?.toString() || '50',
        shelf_layout_pdf_url: store.shelf_layout_pdf_url || '',
        product_category: store.product_category || '',
        contacts: store.contacts || []
      });
    } catch (error) {
      console.error('Failed to load store:', error);
    }
  }

  function handleEdit(store: any) {
    setEditing(store);
    loadStoreDetails(store.id);
    setShowForm(true);
  }

  function handleNew() {
    setEditing(null);
    setFormData({
      chain_name: '',
      type: 'retail',
      address: '',
      gps_latitude: '',
      gps_longitude: '',
      radius_meters: '50',
      shelf_layout_pdf_url: '',
      product_category: '',
      contacts: []
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        gps_latitude: parseFloat(formData.gps_latitude),
        gps_longitude: parseFloat(formData.gps_longitude),
        radius_meters: parseInt(formData.radius_meters)
      };
      
      if (editing) {
        await api.updateStore(editing.id, submitData);
      } else {
        await api.createStore(submitData);
      }
      setShowForm(false);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save store');
    }
  }

  function addContact() {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: '', phone: '', role: '' }]
    });
  }

  function updateContact(index: number, field: string, value: string) {
    const newContacts = [...formData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData({ ...formData, contacts: newContacts });
  }

  function removeContact(index: number) {
    setFormData({
      ...formData,
      contacts: formData.contacts.filter((_, i) => i !== index)
    });
  }

  async function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            gps_latitude: position.coords.latitude.toString(),
            gps_longitude: position.coords.longitude.toString()
          });
        },
        (error) => {
          alert('Failed to get location: ' + error.message);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }

  if (authLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/admin/dashboard" className="text-blue-600">← Dashboard</a>
              <h1 className="text-xl font-bold">Stores</h1>
            </div>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              New Store
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">
                    {editing ? 'Edit Store' : 'New Store'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Chain Name</label>
                      <input
                        type="text"
                        required
                        value={formData.chain_name}
                        onChange={(e) => setFormData({ ...formData, chain_name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'retail' | 'wholesale' })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="retail">Retail</option>
                        <option value="wholesale">Wholesale</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">GPS Latitude</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={formData.gps_latitude}
                          onChange={(e) => setFormData({ ...formData, gps_latitude: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">GPS Longitude</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={formData.gps_longitude}
                          onChange={(e) => setFormData({ ...formData, gps_longitude: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      📍 Use Current Location
                    </button>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Radius (meters)</label>
                        <input
                          type="number"
                          required
                          value={formData.radius_meters}
                          onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Product Category</label>
                        <input
                          type="text"
                          value={formData.product_category}
                          onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Shelf Layout PDF URL</label>
                      <input
                        type="url"
                        value={formData.shelf_layout_pdf_url}
                        onChange={(e) => setFormData({ ...formData, shelf_layout_pdf_url: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contacts</label>
                      {formData.contacts.map((contact, index) => (
                        <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Name"
                            value={contact.name}
                            onChange={(e) => updateContact(index, 'name', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <input
                            type="tel"
                            placeholder="Phone"
                            value={contact.phone}
                            onChange={(e) => updateContact(index, 'phone', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <input
                            type="text"
                            placeholder="Role"
                            value={contact.role}
                            onChange={(e) => updateContact(index, 'role', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeContact(index)}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addContact}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add Contact
                      </button>
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

          {/* Stores Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chain Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GPS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Radius</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No stores found
                    </td>
                  </tr>
                ) : (
                  stores.map((store) => (
                    <tr key={store.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {store.chain_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {store.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {store.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {store.gps_latitude?.toFixed(6)}, {store.gps_longitude?.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {store.radius_meters}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(store)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
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

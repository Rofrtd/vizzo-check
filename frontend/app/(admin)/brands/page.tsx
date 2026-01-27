'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function BrandsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    visit_frequency: '1',
    price_per_visit: '0',
    contacts: [] as Array<{ name: string; phone: string; role: string }>,
    store_ids: [] as string[]
  });
  const [stores, setStores] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    code: '',
    description: '',
    photo_url: ''
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
      const [brandsData, storesData] = await Promise.all([
        api.listBrands(),
        api.listStores()
      ]);
      
      setBrands(brandsData);
      setStores(storesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBrandDetails(id: string) {
    try {
      const brand = await api.getBrand(id);
      setSelectedBrand(brand);
      setFormData({
        name: brand.name || '',
        visit_frequency: brand.visit_frequency?.toString() || '1',
        price_per_visit: brand.price_per_visit?.toString() || '0',
        contacts: brand.contacts || [],
        store_ids: brand.stores?.map((s: any) => s.store_id) || []
      });
    } catch (error) {
      console.error('Failed to load brand:', error);
    }
  }

  function handleEdit(brand: any) {
    setEditing(brand);
    loadBrandDetails(brand.id);
    setShowForm(true);
  }

  function handleNew() {
    setEditing(null);
    setSelectedBrand(null);
    setFormData({
      name: '',
      visit_frequency: '1',
      price_per_visit: '0',
      contacts: [],
      store_ids: []
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.updateBrand(editing.id, formData);
      } else {
        await api.createBrand(formData);
      }
      setShowForm(false);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save brand');
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

  async function handleAddProduct() {
    if (!selectedBrand) return;
    try {
      await api.addProduct(selectedBrand.id, productForm);
      setProductForm({ name: '', code: '', description: '', photo_url: '' });
      await loadBrandDetails(selectedBrand.id);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to add product');
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
              <h1 className="text-xl font-bold">Brands</h1>
            </div>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              New Brand
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
                    {editing ? 'Edit Brand' : 'New Brand'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Visit Frequency</label>
                        <input
                          type="number"
                          required
                          value={formData.visit_frequency}
                          onChange={(e) => setFormData({ ...formData, visit_frequency: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Price per Visit</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.price_per_visit}
                          onChange={(e) => setFormData({ ...formData, price_per_visit: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stores</label>
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
                    {editing && selectedBrand && (
                      <div className="border-t pt-4 mt-4">
                        <h3 className="font-semibold mb-2">Products</h3>
                        <div className="space-y-2 mb-4">
                          {selectedBrand.products?.map((product: any) => (
                            <div key={product.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span>{product.name} ({product.code})</span>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Product Name"
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <input
                            type="text"
                            placeholder="Product Code"
                            value={productForm.code}
                            onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={productForm.description}
                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md col-span-2"
                          />
                          <button
                            type="button"
                            onClick={handleAddProduct}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 col-span-2"
                          >
                            Add Product
                          </button>
                        </div>
                      </div>
                    )}
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

          {/* Brands Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visit Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price per Visit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No brands found
                    </td>
                  </tr>
                ) : (
                  brands.map((brand) => (
                    <tr key={brand.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {brand.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {brand.visit_frequency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${brand.price_per_visit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(brand)}
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
